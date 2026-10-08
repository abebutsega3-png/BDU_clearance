import React from 'react';
import { useAuth } from '../context/authContext';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoutes = ({ children }) => {
  const { user, loading, authError, retryVerification, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p role="status" className="text-sm font-medium text-slate-600">Checking your session...</p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Unable to verify your session</h1>
          <p role="alert" className="mt-2 text-sm text-slate-600">{authError}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={retryVerification}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go to login
            </button>
          </div>
        </section>
      </main>
    );
  }

  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
};

export default PrivateRoutes;