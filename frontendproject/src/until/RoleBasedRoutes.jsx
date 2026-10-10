import React from 'react';
import { useAuth } from '../context/authContext';
import { Navigate, useLocation } from 'react-router-dom';
import { canonicalizeRole, getDashboardPath, getUserRoles, getActiveRole } from './authRoles';

const RoleBasedRoutes = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  const userRoles = getUserRoles(user);
  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole.map((role) => canonicalizeRole(role))
    : [canonicalizeRole(requiredRole)];

  const hasAccess = userRoles.some((role) => allowedRoles.includes(role))
    || (userRoles.length === 0 && allowedRoles.includes(canonicalizeRole(getActiveRole(user))));

  if (!hasAccess) {
    const dashboardPath = getDashboardPath(user)
      || getDashboardPath(getActiveRole(user))
      || '/unauthorized';
    const fallbackPath = dashboardPath && location.pathname !== dashboardPath ? dashboardPath : '/unauthorized';
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