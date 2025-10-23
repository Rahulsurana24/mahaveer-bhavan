import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Loading } from '@/components/ui/loading';

interface LandingProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * This route component redirects authenticated users to their dashboard
 * and shows the landing page to non-authenticated users
 */
export const LandingProtectedRoute = ({ children }: LandingProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: profileLoading } = useUserProfile();

  const loading = authLoading || profileLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  // If user is authenticated, redirect to appropriate dashboard
  if (user) {
    if (role && ['admin', 'superadmin', 'management_admin'].includes(role.name)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Show landing page for non-authenticated users
  return <>{children}</>;
};
