import React from 'react';
import { useAuth } from '../context/authContext';
import { Navigate } from 'react-router-dom';

const normalizeRole = (role) => String(role?.name || role || '')
  .trim()
  .toLowerCase()
  .replace(/[\/_&]+/g, ' ')
  .replace(/[-]+/g, ' ')
  .replace(/\s+/g, ' ');

const canonicalizeRole = (role) => {
  const normalized = normalizeRole(role);

  if (!normalized) return '';

  if (['administrator', 'admin', 'system admin', 'systemadministrator'].includes(normalized)) return 'admin';
  if (['library', 'librarian', 'library officer'].includes(normalized)) return 'library officer';
  if (normalized.includes('property') && normalized.includes('officer')) return 'property officer';
  if (normalized.includes('property') && normalized.includes('asset')) return 'property officer';
  if (normalized === 'department head' || normalized === 'departmenthead') return 'department head';
  if (normalized === 'hr officer') return 'hr officer';
  if (normalized === 'finance officer' || normalized === 'finance office' || normalized === 'finance') return 'finance officer';
  if (['ict officer', 'ict office', 'ict'].includes(normalized)) return 'ict officer';
  if (normalized.includes('ict') && (normalized.includes('officer') || normalized.includes('office'))) return 'ict officer';

  return normalized;
};

const RoleBasedRoutes = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const userRole = canonicalizeRole(user?.role);
  const allowedRoles = requiredRole.map((role) => canonicalizeRole(role));

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default RoleBasedRoutes;