import React from 'react';
import { useAuth } from '../context/authContext';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoutes = ({ children }) => {
  const { user, loading, authError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div role="status" aria-live="polite" className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <span>{authError || 'Checking your session...'}</span>
        </div>
      </main>
    );
  }

  if (authError) {
    return <Navigate to="/login" replace state={{ from: location, sessionWarning: authError }} />;
  }

  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
};

export default PrivateRoutes;