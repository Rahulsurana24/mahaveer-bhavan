import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { TwoFactorVerification } from '@/components/admin/TwoFactorVerification';

const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid admin email address'),
  password: z.string().min(1, 'Password is required'),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export const AdminLoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema)
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    try {
      console.log('[AdminLogin] Attempting login for:', data.email);
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        console.error('[AdminLogin] Sign in error:', error);
        toast({
          title: 'Admin Login Failed',
          description: error.message || 'Invalid admin credentials',
          variant: 'destructive'
        });
        return;
      }

      console.log('[AdminLogin] Authentication successful, fetching user profile...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('[AdminLogin] No user returned after authentication');
        await supabase.auth.signOut();
        toast({
          title: 'Access Denied',
          description: 'Unable to retrieve user information.',
          variant: 'destructive'
        });
        return;
      }

      console.log('[AdminLogin] User ID:', user.id, '- Querying user_profiles...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role_id, user_roles(name)')
        .eq('auth_id', user.id)
        .single();

      console.log('[AdminLogin] Profile query result:', { profile, profileError });

      if (profileError) {
        console.error('[AdminLogin] Profile error:', profileError);
        await supabase.auth.signOut();
        toast({
          title: 'Access Denied',
          description: `Database error: ${profileError.message}. Please contact support.`,
          variant: 'destructive'
        });
        return;
      }

      if (!profile) {
        console.error('[AdminLogin] No profile found for user');
        await supabase.auth.signOut();
        toast({
          title: 'Access Denied',
          description: 'No profile found. Please contact administrator.',
          variant: 'destructive'
        });
        return;
      }

      const roleName = (profile as any)?.user_roles?.name;
      console.log('[AdminLogin] User role:', roleName);
      
      if (!['admin', 'superadmin', 'management_admin', 'view_only_admin'].includes(roleName)) {
        console.log('[AdminLogin] User does not have admin role');
        await supabase.auth.signOut();
        toast({
          title: 'Access Denied',
          description: 'This login is for administrators only. Please use the Member Login.',
          variant: 'destructive'
        });
        return;
      }

      // Check if 2FA is enabled for this user
      console.log('[AdminLogin] Checking 2FA status...');
      const { data: twoFactorData, error: twoFactorError } = await supabase
        .from('admin_two_factor')
        .select('is_enabled')
        .eq('user_id', user.id)
        .single();

      if (twoFactorError && twoFactorError.code !== 'PGRST116') {
        console.error('[AdminLogin] Error checking 2FA status:', twoFactorError);
      }

      const is2FAEnabled = twoFactorData?.is_enabled === true;
      console.log('[AdminLogin] 2FA enabled:', is2FAEnabled);

      if (is2FAEnabled) {
        // Show 2FA verification dialog
        console.log('[AdminLogin] 2FA required, showing verification dialog');
        setPendingUserId(user.id);
        setShow2FAVerification(true);
      } else {
        // Complete login without 2FA
        console.log('[AdminLogin] Admin access granted (no 2FA)');
        toast({
          title: 'Welcome Admin',
          description: 'Successfully authenticated.'
        });
      }
    } catch (error: any) {
      console.error('[AdminLogin] Unexpected error:', error);
      toast({
        title: 'Admin Login Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handle2FASuccess = () => {
    console.log('[AdminLogin] 2FA verification successful');
    setShow2FAVerification(false);
    setPendingUserId(null);
    toast({
      title: 'Welcome Admin',
      description: 'Successfully authenticated with 2FA.'
    });
  };

  const handle2FACancel = async () => {
    console.log('[AdminLogin] 2FA verification cancelled, signing out');
    setShow2FAVerification(false);
    setPendingUserId(null);
    await supabase.auth.signOut();
    toast({
      title: 'Login Cancelled',
      description: 'Two-factor authentication is required.',
      variant: 'destructive'
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Alert className="border-primary/20 bg-primary/5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-muted-foreground">
            This area is restricted to authorized administrators only.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="admin-email">Admin Email</Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="admin@mahaveer.com"
            {...register('email')}
            className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className={errors.password ? 'border-destructive focus-visible:ring-destructive pr-10' : 'pr-10'}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin Sign In
            </>
          )}
        </Button>

        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="text-sm"
          >
            Back to Member Login
          </Button>
        </div>
      </form>

      {/* 2FA Verification Dialog */}
      {show2FAVerification && pendingUserId && (
        <TwoFactorVerification
          isOpen={show2FAVerification}
          userId={pendingUserId}
          onSuccess={handle2FASuccess}
          onCancel={handle2FACancel}
        />
      )}
    </>
  );
};
