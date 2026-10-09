import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const userContext = createContext();
let refreshPromise;

const isAuthenticationFailure = (error) => {
  if (error.response?.status !== 401 || error.config?.url?.includes('/api/auth/login')) return false;

  const headers = error.config?.headers;
  const authorization = headers?.get?.('Authorization')
    ?? headers?.Authorization
    ?? headers?.authorization;
  const message = String(error.response?.data?.message || '').toLowerCase();
  return Boolean(authorization?.startsWith('Bearer '))
    || /authentication token|session has been revoked/i.test(message);
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const verificationId = useRef(0);
  const automaticRetryCount = useRef(0);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const request = error.config;
        if (
          !isAuthenticationFailure(error)
          || request?._retry
          || request?.suppressAutomaticLogout
          || !localStorage.getItem('token')
        ) {
          return Promise.reject(error);
        }

        request._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = axios.post('/api/auth/refresh', {}, { withCredentials: true })
              .finally(() => { refreshPromise = null; });
          }
          const response = await refreshPromise;
          if (!response.data?.token) throw new Error('Session refresh did not return an access token.');
          localStorage.setItem('token', response.data.token);
          if (request.headers?.set) request.headers.set('Authorization', `Bearer ${response.data.token}`);
          else request.headers = { ...request.headers, Authorization: `Bearer ${response.data.token}` };
          return axios(request);
        } catch (refreshError) {
          if (refreshError.response?.status === 401) {
            if (String(request.url || '').includes('/api/property/dashboard/employees/search')) {
              const params = new URLSearchParams(window.location.search);
              params.set('resumeEmployeeSearch', 'true');
              if (request.params?.search) params.set('employeeSearch', request.params.search);
              sessionStorage.setItem('postLoginReturnTo', `${window.location.pathname}?${params.toString()}`);
            }
            localStorage.removeItem('token');
            setUser(null);
          }
          return Promise.reject(refreshError);
        }
      }
    );

    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  useEffect(() => {
    const requestId = ++verificationId.current;
    const controller = new AbortController();
    let retryScheduled = false;
    let retryTimer;
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/verify', {
            timeout: 15000,
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` }
          });
          if (requestId !== verificationId.current || controller.signal.aborted) return;
          if (!response.data?.success || !response.data.user) {
            throw new Error(response.data?.message || 'Session verification failed.');
          }
          setUser(response.data.user);
          setAuthError('');
          automaticRetryCount.current = 0;
        } catch (error) {
          if (requestId !== verificationId.current || controller.signal.aborted) return;
          if (error.response?.status === 401) {
            automaticRetryCount.current = 0;
            localStorage.removeItem('token');
            setAuthError('');
          } else if (automaticRetryCount.current < 2) {
            automaticRetryCount.current += 1;
            retryScheduled = true;
            retryTimer = window.setTimeout(() => {
              if (requestId !== verificationId.current) return;
              setLoading(true);
              setVerificationAttempt((attempt) => attempt + 1);
            }, 1000 * automaticRetryCount.current);
          } else {
            console.error('Session verification failed after retries:', error.message);
            const message = error.response?.data?.message
              || (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
                ? 'Session verification timed out. Check that the backend and database are running, then retry.'
                : !error.response
                  ? 'Unable to reach the server. Check that the backend is running, then retry.'
                  : error.message || 'Unable to verify your session. Please retry.');
            setAuthError(message);
          }
          if (!retryScheduled) setUser(null);
        } finally {
          if (requestId === verificationId.current && !retryScheduled) setLoading(false);
        }
      } else {
        automaticRetryCount.current = 0;
        setUser(null);
        setAuthError('');
        setLoading(false);
      }
    };
    verifyUser();
    return () => {
      controller.abort();
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [verificationAttempt]);

  const login = useCallback((userData) => {
    verificationId.current += 1;
    setAuthError('');
    setUser(userData);
    setLoading(false);
  }, []);

  const retryVerification = useCallback(() => {
    automaticRetryCount.current = 0;
    setAuthError('');
    setLoading(true);
    setVerificationAttempt((attempt) => attempt + 1);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((currentUser) => ({ ...currentUser, ...userData }));
  }, []);

  const logout = useCallback(({ redirect = true, clearUser = true } = {}) => {
    verificationId.current += 1;
    if (clearUser) {
      setUser(null);
      setAuthError('');
    }
    localStorage.removeItem('token');
    void axios.post('/api/auth/logout', {}, { withCredentials: true })
      .catch((error) => console.error('Unable to clear server sign-in session:', error.message));
    if (redirect) window.location.replace('/login');
  }, []);

  return (
    <userContext.Provider value={{ user, login, updateUser, logout, loading, authError, retryVerification }}>
      {children}
    </userContext.Provider>
  );
};

export const useAuth = () => useContext(userContext);
export default AuthProvider;