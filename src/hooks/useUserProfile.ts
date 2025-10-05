import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  login_count: number;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  needs_password_change?: boolean;
}

interface UserRole {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
}

export const useUserProfile = () => {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !session) {
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            *,
            user_roles (
              id,
              name,
              description,
              permissions
            )
          `)
          .eq('auth_id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        setProfile(profileData);
        setRole(profileData.user_roles);
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, session]);

  const hasPermission = (permission: string): boolean => {
    if (!role?.permissions) return false;
    
    // Check if permission exists in any category
    const permissions = role.permissions;
    
    if (permissions[permission]) return true;
    
    // Check nested permissions
    for (const category of Object.values(permissions)) {
      if (typeof category === 'object' && category[permission]) {
        return true;
      }
    }
    
    return false;
  };

  const isAdmin = (): boolean => {
    return role?.name === 'admin' || role?.name === 'superadmin' || role?.name === 'management_admin';
  };

  const isSuperAdmin = (): boolean => {
    return role?.name === 'superadmin';
  };

  return {
    profile,
    role,
    loading,
    error,
    hasPermission,
    isAdmin,
    isSuperAdmin
  };
};