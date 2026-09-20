import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';

export function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#DC2626', marginBottom: '12px' }}>Acceso Restringido</h2>
        <p style={{ color: '#4A3B32' }}>Tu perfil de <strong>{user?.role}</strong> no tiene permisos para ver este módulo.</p>
      </div>
    );
  }

  return <Outlet />;
}
