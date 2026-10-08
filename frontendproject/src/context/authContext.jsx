import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const userContext = createContext();

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

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          isAuthenticationFailure(error)
          && !error.config?.suppressAutomaticLogout
          && localStorage.getItem('token')
        ) {
          localStorage.removeItem('token');
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  useEffect(() => {
    const requestId = ++verificationId.current;
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/verify', {
            timeout: 8000,
            headers: { Authorization: `Bearer ${token}` }
          });
          if (requestId !== verificationId.current) return;
          if (!response.data?.success || !response.data.user) {
            throw new Error(response.data?.message || 'Session verification failed.');
          }
          setUser(response.data.user);
          setAuthError('');
        } catch (error) {
          if (requestId !== verificationId.current) return;
          console.error('Session verification failed:', error.message);
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            setAuthError('');
          } else {
            const message = error.response?.data?.message
              || (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
                ? 'Session verification timed out. Check that the backend and database are running, then retry.'
                : !error.response
                  ? 'Unable to reach the server. Check that the backend is running, then retry.'
                  : error.message || 'Unable to verify your session. Please retry.');
            setAuthError(message);
          }
          setUser(null);
        } finally {
          if (requestId === verificationId.current) setLoading(false);
        }
      } else {
        setUser(null);
        setAuthError('');
        setLoading(false);
      }
    };
    verifyUser();
  }, [verificationAttempt]);

  const login = useCallback((userData) => {
    verificationId.current += 1;
    setAuthError('');
    setUser(userData);
    setLoading(false);
  }, []);

  const retryVerification = useCallback(() => {
    setAuthError('');
    setLoading(true);
    setVerificationAttempt((attempt) => attempt + 1);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((currentUser) => ({ ...currentUser, ...userData }));
  }, []);

  const logout = useCallback(() => {
    verificationId.current += 1;
    setUser(null);
    setAuthError('');
    localStorage.removeItem('token');
    window.location.replace('/login');
  }, []);

  return (
    <userContext.Provider value={{ user, login, updateUser, logout, loading, authError, retryVerification }}>
      {children}
    </userContext.Provider>
  );
};

export const useAuth = () => useContext(userContext);
export default AuthProvider;