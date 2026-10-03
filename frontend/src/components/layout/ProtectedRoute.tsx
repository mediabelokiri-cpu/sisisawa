import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  allowedRoles?: ('ADMIN' | 'KASIR')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles = ['ADMIN'] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <LoadingSpinner size="lg" label="Memverifikasi akses pengguna..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // If Kasir tries to access Admin Panel, redirect to POS Kasir
    if (user.role === 'KASIR') {
      return <Navigate to="/pos" replace />;
    }
    // If Admin accesses cashier routes
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};
