import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Loading } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  redirectTo?: string;
}

interface MemberData {
  is_first_login: boolean;
  password_changed_at: string | null;
}

export const ProtectedRoute = ({ 
  children, 
  requireAuth = true,
  requireAdmin = false,
  requireSuperAdmin = false,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, role, loading: profileLoading, isAdmin } = useUserProfile();
  const location = useLocation();
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);

  // Fetch member-specific data for password tracking
  useEffect(() => {
    const fetchMemberData = async () => {
      if (!user) {
        setMemberData(null);
        setMemberLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('members')
          .select('is_first_login, password_changed_at')
          .eq('auth_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching member data:', error);
          setMemberData(null);
        } else {
          setMemberData(data);
        }
      } catch (err) {
        console.error('Error in fetchMemberData:', err);
        setMemberData(null);
      } finally {
        setMemberLoading(false);
      }
    };

    fetchMemberData();
  }, [user]);

  const loading = authLoading || profileLoading || memberLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check if password change is required
  const needsPasswordChange = memberData?.is_first_login === true;
  const isPasswordChangeRoute = location.pathname === '/auth/password-management' || 
                                  location.pathname === '/admin/change-password' ||
                                  location.pathname === '/change-password';

  // Redirect to appropriate password change page if needed (but not if already on one)
  if (needsPasswordChange && !isPasswordChangeRoute && user) {
    // Admins go to admin password change, members go to auth password management
    if (isAdmin()) {
      return <Navigate to="/admin/change-password" replace />;
    } else {
      return <Navigate to="/auth/password-management" replace />;
    }
  }

  // Check admin requirement
  if (requireAdmin && (!role || !['admin', 'superadmin', 'management_admin', 'partial_admin', 'view_only'].includes(role.name))) {
    // Non-admin trying to access admin routes → redirect to member dashboard
    return <Navigate to="/member/dashboard" replace />;
  }

  // Check super admin requirement
  if (requireSuperAdmin && (!role || !['superadmin', 'admin'].includes(role.name))) {
    // Non-superadmin trying to access superadmin routes → redirect to dashboard
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};