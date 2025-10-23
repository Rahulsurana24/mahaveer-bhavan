import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/layout/auth-layout';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'login' | 'signup' | 'forgot-password';

const Auth = () => {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      if (user && !userRole) {
        setCheckingRole(true);
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('role_id, user_roles(name)')
            .eq('auth_id', user.id)
            .single();

          if (!error && data) {
            const role = (data as any)?.user_roles?.name;
            setUserRole(role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        } finally {
          setCheckingRole(false);
        }
      }
    };

    checkUserRole();
  }, [user, userRole]);

  if (loading || checkingRole) {
    return (
      <AuthLayout title="Loading...">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AuthLayout>
    );
  }

  // Redirect authenticated users to appropriate dashboard
  if (user) {
    if (userRole && ['admin', 'superadmin', 'management_admin'].includes(userRole)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Welcome Back';
      case 'signup':
        return 'Join Our Community';
      case 'forgot-password':
        return 'Reset Password';
      default:
        return 'Welcome';
    }
  };

  return (
    <AuthLayout title={getTitle()}>
      {mode === 'login' && (
        <LoginForm 
          onSignUpClick={() => setMode('signup')}
          onForgotPasswordClick={() => setMode('forgot-password')}
        />
      )}
      {mode === 'signup' && (
        <SignUpForm 
          onLoginClick={() => setMode('login')}
        />
      )}
      {mode === 'forgot-password' && (
        <ForgotPasswordForm 
          onBackToLoginClick={() => setMode('login')}
        />
      )}
    </AuthLayout>
  );
};

export default Auth;