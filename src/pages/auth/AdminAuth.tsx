import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AuthLayout } from '@/components/layout/auth-layout';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { Loading } from '@/components/ui/loading';

const AdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: profileLoading } = useUserProfile();

  if (authLoading || profileLoading) {
    return (
      <AuthLayout title="Admin Access">
        <div className="flex justify-center">
          <Loading size="lg" text="Verifying credentials..." />
        </div>
      </AuthLayout>
    );
  }

  // If user is logged in and is admin, redirect to admin dashboard
  if (user && role && ['admin', 'superadmin', 'management_admin', 'view_only_admin'].includes(role.name)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // If user is logged in but not admin, redirect to home
  if (user && role && !['admin', 'superadmin', 'management_admin', 'view_only_admin'].includes(role.name)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout title="Admin Access">
      <AdminLoginForm />
    </AuthLayout>
  );
};

export default AdminAuth;
