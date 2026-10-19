import React, { useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { canAccessPathForRole, getDashboardPath } from '../until/authRoles';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).has('resetToken') ? 'set-password' : 'login');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const sessionWarning = typeof location.state?.sessionWarning === 'string'
    ? location.state.sessionWarning
    : '';

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
    <main className="flex min-h-[calc(100vh-106px)] items-start justify-center bg-[#fbfcfd] px-4 py-8 text-slate-900 sm:py-8">
      <form
        onSubmit={mode === 'login' ? handleLogin : mode === 'request-reset' ? handlePasswordResetRequest : handleSetNewPassword}
        className="w-full max-w-[480px] rounded-[20px] border border-slate-100 bg-white px-6 py-8 shadow-[0_8px_28px_rgba(15,23,42,0.12)] sm:px-9 sm:py-8"
      >
        <div className="mb-7 text-center">
          <h2 className="text-[26px] font-bold leading-tight text-[#28577f] sm:text-[28px]">
            {mode === 'login' ? 'USER LOGIN' : mode === 'request-reset' ? 'RESET PASSWORD' : 'CHOOSE A NEW PASSWORD'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {mode === 'login' ? 'Welcome back!' : mode === 'request-reset' ? 'We will help you get back into your account.' : 'Create a new password for your account.'}
          </p>
        </div>

        {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {sessionWarning && <p role="status" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{sessionWarning} Please sign in again when the service is available.</p>}
        {notice && <p role="status" className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

        {(mode === 'login' || mode === 'request-reset') && (
          <div className="mb-4">
            <label htmlFor="identifier" className="mb-1 block text-sm font-medium text-slate-700">
              {mode === 'login' ? 'Username' : 'Username or email address'}
            </label>
            <div className="flex h-[42px] overflow-hidden rounded-md border border-slate-400 bg-white transition focus-within:border-[#28618e] focus-within:ring-2 focus-within:ring-blue-100">
              <span className="flex w-10 shrink-0 items-center justify-center border-r border-slate-300 bg-slate-100 text-slate-600">
                <UserRound size={18} aria-hidden="true" />
              </span>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. jdoe123 or jane.doe@bdu.edu.et"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </div>
        )}

        {mode === 'login' && (
          <>
            <div className="mb-1">
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <div className="flex h-[42px] overflow-hidden rounded-md border border-slate-400 bg-white transition focus-within:border-[#28618e] focus-within:ring-2 focus-within:ring-blue-100">
                <span className="flex w-10 shrink-0 items-center justify-center border-r border-slate-300 bg-slate-100 text-slate-600">
                  <LockKeyhole size={17} aria-hidden="true" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="flex w-10 shrink-0 items-center justify-center text-slate-500 transition hover:text-[#28577f]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="mb-5 flex justify-end">
              <button type="button" onClick={() => changeMode('request-reset')} className="text-xs font-medium text-[#39749c] hover:underline">
                Forgot password?
              </button>
            </div>
          </>
        )}

        {mode === 'request-reset' && (
          <>
            <p className="mb-5 text-sm leading-relaxed text-slate-600">
              Password reset instructions will be sent to your registered email address.
            </p>
            <button type="button" onClick={() => changeMode('login')} className="mb-4 block text-sm font-medium text-[#39749c] hover:underline">
              Back to login
            </button>
          </>
        )}

        {mode === 'set-password' && (
          <>
            <div className="mb-4">
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">New password</label>
              <div className="flex h-[42px] overflow-hidden rounded-md border border-slate-400 bg-white focus-within:border-[#28618e] focus-within:ring-2 focus-within:ring-blue-100">
                <span className="flex w-10 shrink-0 items-center justify-center border-r border-slate-300 bg-slate-100 text-slate-600"><LockKeyhole size={17} aria-hidden="true" /></span>
                <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" required />
              </div>
            </div>
            <div className="mb-5">
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
              <div className="flex h-[42px] overflow-hidden rounded-md border border-slate-400 bg-white focus-within:border-[#28618e] focus-within:ring-2 focus-within:ring-blue-100">
                <span className="flex w-10 shrink-0 items-center justify-center border-r border-slate-300 bg-slate-100 text-slate-600"><LockKeyhole size={17} aria-hidden="true" /></span>
                <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" required />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[42px] w-full items-center justify-center gap-2 rounded-md bg-[#28618e] px-5 text-sm font-bold text-white transition hover:bg-[#204f77] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mode === 'login' && <LockKeyhole size={16} aria-hidden="true" />}
          {isSubmitting
            ? 'Please wait...'
            : mode === 'login' ? 'LOG IN' : mode === 'request-reset' ? 'SEND RESET INSTRUCTIONS' : 'SET NEW PASSWORD'}
        </button>
      </form>
    </main>
  );
}