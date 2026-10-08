import React from 'react';
import { useAuth } from '../context/authContext';
import { Navigate, useLocation } from 'react-router-dom';
import { canonicalizeRole, getDashboardPath } from './authRoles';

const RoleBasedRoutes = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  const userRole = canonicalizeRole(user?.role);
  const allowedRoles = requiredRole.map((role) => canonicalizeRole(role));

  if (!userRole || !allowedRoles.includes(userRole)) {
    const dashboardPath = getDashboardPath(user?.role);
    const fallbackPath = dashboardPath && location.pathname !== dashboardPath
      ? dashboardPath
      : '/unauthorized';
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={fallbackPath === '/unauthorized' ? { from: location } : undefined}
      />
    );
  }

  return children;
};

export default RoleBasedRoutes;