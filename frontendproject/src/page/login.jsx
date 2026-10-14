import React, { useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { canAccessPathForRole, getDashboardPath } from '../until/authRoles';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).has('resetToken') ? 'set-password' : 'login');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const handleLogin = async (e) => {
    // const {user}=usecontext{userContext}
    e.preventDefault();

    setError('');

    if (!identifier.trim() || !password) {
      setError('Please enter your username or email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/auth/login', {
        identifier: identifier.trim(),
        password,
      }, {
        timeout: 10000,
      });

      if (response.status === 200 && response.data?.success) {
        localStorage.removeItem('activeRole');
        localStorage.setItem('token', response.data.token);
        login(response.data.user);
        const dashboardPath = getDashboardPath(response.data.user?.role);
        const savedReturnTo = sessionStorage.getItem('postLoginReturnTo');
        sessionStorage.removeItem('postLoginReturnTo');
        let savedDestination = '';
        if (savedReturnTo?.startsWith('/') && !savedReturnTo.startsWith('//')) {
          const savedUrl = new URL(savedReturnTo, window.location.origin);
          if (savedUrl.origin === window.location.origin && canAccessPathForRole(savedUrl.pathname, response.data.user?.role)) {
            savedDestination = `${savedUrl.pathname}${savedUrl.search}${savedUrl.hash}`;
          }
        }
        const requestedLocation = location.state?.from;
        const requestedPath = requestedLocation?.pathname;
        const destination = savedDestination
          || (requestedPath && canAccessPathForRole(requestedPath, response.data.user?.role)
          ? { pathname: requestedPath, search: requestedLocation.search || '', hash: requestedLocation.hash || '' }
          : dashboardPath || '/unauthorized');
        navigate(destination, { replace: true });
        return;
      }

      setError(response.data?.message || 'Login failed. Please try again.');
    } catch (error) {
      console.error('Login failed:', error);
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        setError('Login is taking too long. Please try again in a moment.');
      } else if (!error.response) {
        setError('The login server is unavailable. Start the backend and try again.');
      } else {
        setError(error.response.data?.message || 'Invalid username/email or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!identifier.trim()) {
      setError('Please enter your username or email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/auth/forgot-password', {
        identifier: identifier.trim(),
      }, { timeout: 10000 });
      setNotice(response.data?.message || 'If an account matches that username or email, password reset instructions will be sent to its registered email address.');
    } catch (resetError) {
      console.error('Password reset request failed:', resetError);
      setError(resetError.response?.data?.message || (!resetError.response
        ? 'The reset service is unavailable. Start the backend and try again.'
        : 'Unable to request a password reset right now. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (resetPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (resetPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = new URLSearchParams(window.location.search).get('resetToken');
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password: resetPassword,
        confirmPassword,
      }, { timeout: 10000 });
      setPassword('');
      setResetPassword('');
      setConfirmPassword('');
      changeMode('login');
      setNotice(response.data?.message || 'Your password has been reset. You can now log in.');
      navigate('/login', { replace: true });
    } catch (resetError) {
      console.error('Password reset failed:', resetError);
      setError(resetError.response?.data?.message || (!resetError.response
        ? 'The reset service is unavailable. Start the backend and try again.'
        : 'Unable to reset your password. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-6.25rem)] bg-white px-4 pb-12 pt-[clamp(7rem,18vh,13.5rem)] text-slate-900">
      <div className="mx-auto w-full max-w-[576px]">
        <div className="flex items-end gap-1 pl-[clamp(1rem,22vw,9rem)]">
          <button
            type="button"
            onClick={() => changeMode('login')}
            className={`rounded-t px-5 py-3 text-base font-bold ${mode === 'login' ? 'bg-[#d9d9d9]' : 'text-slate-900'}`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => changeMode('request-reset')}
            className={`rounded-t px-4 py-3 text-base font-bold text-slate-900 ${mode !== 'login' ? 'bg-[#d9d9d9]' : ''}`}
          >
            Reset your password
          </button>
        </div>
        <form
          onSubmit={mode === 'login' ? handleLogin : mode === 'request-reset' ? handlePasswordResetRequest : handleSetNewPassword}
          className="rounded-b border border-slate-200 bg-white px-6 py-10 sm:px-12"
        >
          <div className="mb-11 text-center">
            <h2 className="text-[26px] font-bold leading-tight">
              {mode === 'login' ? 'User Login' : mode === 'request-reset' ? 'Reset Your Password' : 'Choose a New Password'}
            </h2>
          </div>

          {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

          {(mode === 'login' || mode === 'request-reset') && (
            <div className={mode === 'login' ? 'mb-5' : 'mb-4'}>
              <label htmlFor="identifier" className="mb-1 block text-base text-slate-800">
                {mode === 'login' ? 'Username' : 'Username or email address'}
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-[38px] w-full border border-[#dedede] bg-[#f4f4f4] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          )}

          {mode === 'login' && (
            <>
              <div className="mb-1">
                <label htmlFor="password" className="mb-1 block text-base text-slate-800">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[38px] w-full border border-[#dedede] bg-[#f4f4f4] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="mb-5 flex justify-end">
                <button type="button" onClick={() => changeMode('request-reset')} className="text-sm text-[#31a8e3] hover:underline">
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {mode === 'request-reset' && (
            <p className="mb-14 text-sm text-slate-700">
              Password reset instructions will be sent to your registered email address.
            </p>
          )}

          {mode === 'set-password' && (
            <>
              <div className="mb-4">
                <label htmlFor="new-password" className="mb-1 block text-base text-slate-800">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="h-[38px] w-full border border-[#dedede] bg-[#f4f4f4] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
              <div className="mb-5">
                <label htmlFor="confirm-password" className="mb-1 block text-base text-slate-800">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-[38px] w-full border border-[#dedede] bg-[#f4f4f4] px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </>
          )}

          <div className={mode === 'request-reset' ? 'flex justify-center' : ''}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex h-11 items-center justify-center rounded-md bg-[#5ca9ef] px-5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70 ${mode === 'request-reset' ? 'min-w-[157px]' : 'w-full'}`}
            >
              {isSubmitting
                ? 'Please wait...'
                : mode === 'login' ? 'Login' : mode === 'request-reset' ? 'Reset Password' : 'Set New Password'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}