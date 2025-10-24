import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthLayout } from '@/components/layout/auth-layout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EmailConfirmation = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get the session from the URL (Supabase automatically handles this)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Confirmation error:', error);
          setStatus('error');
          setMessage('Email confirmation failed. The link may be invalid or expired.');
          toast({
            title: 'Confirmation Failed',
            description: error.message,
            variant: 'destructive'
          });
          return;
        }

        if (session) {
          setStatus('success');
          setMessage('Email confirmed successfully! Redirecting you to the app...');
          toast({
            title: 'Email Confirmed!',
            description: 'Your email has been verified successfully.'
          });

          // Redirect based on user role
          setTimeout(async () => {
            const { data: userData } = await supabase
              .from('members')
              .select('role')
              .eq('auth_id', session.user.id)
              .single();

            if (userData?.role === 'admin' || userData?.role === 'superadmin') {
              navigate('/admin');
            } else {
              navigate('/member/dashboard');
            }
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No session found. Please try logging in again.');
        }
      } catch (error: any) {
        console.error('Unexpected error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        toast({
          title: 'Error',
          description: 'Something went wrong. Please contact support.',
          variant: 'destructive'
        });
      }
    };

    confirmEmail();
  }, [navigate, toast]);

  return (
    <AuthLayout title="Email Confirmation">
      <div className="flex flex-col items-center justify-center space-y-6 py-8">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Success!</h3>
              <p className="text-muted-foreground">{message}</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Confirmation Failed</h3>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/auth')} variant="default">
                  Go to Login
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default EmailConfirmation;
