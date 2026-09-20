import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from 'lucide-react';
import campusImage from '../assets/image1.png';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    // const {user}=usecontext{userContext}
    e.preventDefault();

    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email or username and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (response.status === 200 && response.data?.success) {
        localStorage.setItem('token', response.data.token);
        login(response.data.user);
        const userRole = String(response.data.user?.role || '')
          .trim()
          .toLowerCase()
          .replace(/[\/_&]+/g, ' ')
          .replace(/[-]+/g, ' ')
          .replace(/\s+/g, ' ');

        if (userRole === 'hr officer') {
          navigate('/hr-office');
        } else if (['admin', 'administrator', 'system admin', 'systemadministrator'].includes(userRole)) {
          navigate('/admin');
        } else if (userRole === 'department head' || userRole === 'departmenthead') {
          navigate('/department-head');
        } else if (userRole === 'finance officer' || userRole === 'finance office' || userRole === 'finance') {
          navigate('/finance-office');
        } else if (['library officer', 'library', 'librarian'].includes(userRole)) {
          navigate('/library-office');
        } else if (['ict officer', 'ict office', 'ict'].includes(userRole) || (userRole.includes('ict') && (userRole.includes('officer') || userRole.includes('office')))) {
          navigate('/ict-office');
        } else if (userRole.includes('property') && (userRole.includes('officer') || userRole.includes('asset'))) {
          navigate('/property');
        } else {
          navigate('/employee-dashboard');
        }
        return;
      }

      setError(response.data?.message || 'Login failed. Please try again.');
    } catch (error) {
      console.error('Login failed:', error);
      if (!error.response) {
        setError('The login server is unavailable. Start the backend and try again.');
      } else {
        setError(error.response.data?.message || 'Invalid email, username, or password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="relative flex min-h-[calc(100vh-5.4rem)] items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-800 sm:min-h-[calc(100vh-5.4rem)]"
      style={{ backgroundImage: `url(${campusImage})`, backgroundPosition: 'center', backgroundSize: 'cover' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,15,35,0.84),rgba(4,15,35,0.5))]" />
      <form onSubmit={handleLogin} className="relative z-10 w-full max-w-[430px] rounded-xl border border-slate-200 bg-white px-5 py-7 shadow-[0_10px_35px_rgba(15,23,42,0.08)] sm:px-8 sm:py-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <LockKeyhole size={23} strokeWidth={2.2} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#12356b]">Login</h2>
          <p className="mt-2 text-xs text-slate-500">Access your account to manage your clearance process</p>
        </div>

        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mb-5">
          <label htmlFor="identifier" className="mb-2 block text-xs font-semibold text-slate-700">Email / Employee ID / Username / Full Name</label>
          <div className="relative">
            <UserRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="Enter your email, Employee ID, username, or full name"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            required
          />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="mb-2 block text-xs font-semibold text-slate-700">Password</label>
          <div className="relative">
            <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            required
          />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-slate-600">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-blue-700" />
            Remember Me
          </label>
          <button type="button" className="font-semibold text-blue-700 hover:text-blue-900">Forgot Password?</button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <LogIn size={16} />
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </main>
  );
}