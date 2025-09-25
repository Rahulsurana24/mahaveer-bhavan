import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/layout/auth-layout';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

type AuthMode = 'login' | 'signup' | 'forgot-password';

const Auth = () => {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  if (loading) {
    return (
      <AuthLayout title="Loading...">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AuthLayout>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
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