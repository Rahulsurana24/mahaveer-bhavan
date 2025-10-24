import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

type PasswordManagementMode = 'first-login' | 'recovery' | 'manual-change';

const passwordSchema = z.object({
  current_password: z.string().optional(),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const PasswordManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<PasswordManagementMode>('manual-change');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange'
  });

  useEffect(() => {
    const checkPasswordStatus = async () => {
      // Check if this is a recovery flow
      const recoveryToken = searchParams.get('token');
      const type = searchParams.get('type');

      if (recoveryToken && type === 'recovery') {
        setMode('recovery');
        setIsRecovery(true);
        return;
      }

      // Check if user needs to change password (first login)
      if (user) {
        const { data: memberData, error } = await supabase
          .from('members')
          .select('is_first_login, password_changed_at')
          .eq('auth_id', user.id)
          .single();

        if (!error && memberData) {
          if (memberData.is_first_login || !memberData.password_changed_at) {
            setMode('first-login');
            setIsFirstLogin(true);
          } else {
            setMode('manual-change');
          }
        }
      }
    };

    checkPasswordStatus();
  }, [user, searchParams]);

  const onSubmit = async (data: PasswordFormData) => {
    try {
      if (mode === 'recovery') {
        // Password recovery flow
        const { error } = await supabase.auth.updateUser({
          password: data.new_password
        });

        if (error) throw error;

        toast({
          title: 'Password Reset Successful',
          description: 'Your password has been updated. You can now login with your new password.'
        });

        navigate('/auth');
      } else if (mode === 'first-login') {
        // First login mandatory change
        const { error } = await supabase.auth.updateUser({
          password: data.new_password
        });

        if (error) throw error;

        // Update member record
        if (user) {
          await supabase
            .from('members')
            .update({
              is_first_login: false,
              password_changed_at: new Date().toISOString()
            })
            .eq('auth_id', user.id);
        }

        toast({
          title: 'Password Updated',
          description: 'Your password has been set successfully. Welcome to Sree Mahaveer Seva!'
        });

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // Manual password change
        if (!data.current_password) {
          toast({
            title: 'Current Password Required',
            description: 'Please enter your current password',
            variant: 'destructive'
          });
          return;
        }

        // Verify current password by attempting to sign in
        const email = user?.email;
        if (!email) {
          throw new Error('User email not found');
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: data.current_password
        });

        if (signInError) {
          toast({
            title: 'Incorrect Password',
            description: 'Current password is incorrect',
            variant: 'destructive'
          });
          return;
        }

        // Update password
        const { error } = await supabase.auth.updateUser({
          password: data.new_password
        });

        if (error) throw error;

        // Update member record
        await supabase
          .from('members')
          .update({
            password_changed_at: new Date().toISOString()
          })
          .eq('auth_id', user.id);

        toast({
          title: 'Password Changed',
          description: 'Your password has been updated successfully'
        });

        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-4 border-2 border-[#00A36C]">
            <Lock className="h-10 w-10 text-[#00A36C]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {mode === 'first-login' && 'Set Your Password'}
            {mode === 'recovery' && 'Reset Password'}
            {mode === 'manual-change' && 'Change Password'}
          </h1>
          <p className="text-gray-400">
            {mode === 'first-login' && 'Welcome! Please create a secure password'}
            {mode === 'recovery' && 'Create a new password for your account'}
            {mode === 'manual-change' && 'Update your account password'}
          </p>
        </div>

        {/* Alert for First Login */}
        {mode === 'first-login' && (
          <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm text-gray-300">
              <strong>Action Required:</strong> For security reasons, you must change your password before accessing your account.
            </AlertDescription>
          </Alert>
        )}

        {/* Password Form */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">
              {mode === 'first-login' && 'Create New Password'}
              {mode === 'recovery' && 'Choose New Password'}
              {mode === 'manual-change' && 'Update Password'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Password must be at least 8 characters long
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Current Password (for manual change only) */}
              {mode === 'manual-change' && (
                <div className="space-y-2">
                  <Label htmlFor="current_password" className="text-gray-300">
                    Current Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      {...register('current_password')}
                      className="bg-white/10 border-white/20 text-white pr-10"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.current_password && (
                    <p className="text-sm text-red-400">{errors.current_password.message}</p>
                  )}
                </div>
              )}

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-gray-300">
                  {mode === 'manual-change' ? 'New Password' : 'Password'} *
                </Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    {...register('new_password')}
                    className="bg-white/10 border-white/20 text-white pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.new_password && (
                  <p className="text-sm text-red-400">{errors.new_password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-gray-300">
                  Confirm Password *
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirm_password')}
                    className="bg-white/10 border-white/20 text-white pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-sm text-red-400">{errors.confirm_password.message}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Password must contain:</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className={`h-3 w-3 ${watch('new_password')?.length >= 8 ? 'text-green-400' : 'text-gray-600'}`} />
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className={`h-3 w-3 ${/[A-Z]/.test(watch('new_password') || '') ? 'text-green-400' : 'text-gray-600'}`} />
                    One uppercase letter (recommended)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className={`h-3 w-3 ${/[0-9]/.test(watch('new_password') || '') ? 'text-green-400' : 'text-gray-600'}`} />
                    One number (recommended)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className={`h-3 w-3 ${/[!@#$%^&*]/.test(watch('new_password') || '') ? 'text-green-400' : 'text-gray-600'}`} />
                    One special character (recommended)
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base bg-[#00A36C] hover:bg-[#008F5C] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {mode === 'first-login' ? 'Setting Password...' : 'Updating Password...'}
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    {mode === 'first-login' ? 'Set Password & Continue' : 'Update Password'}
                  </>
                )}
              </Button>

              {/* Cancel button (only for manual change) */}
              {mode === 'manual-change' && !isFirstLogin && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white hover:bg-white/10"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer note for first login */}
        {mode === 'first-login' && (
          <p className="text-center text-sm text-gray-400 mt-4">
            You cannot access your account until you set a new password
          </p>
        )}
      </div>
    </div>
  );
};

export default PasswordManagement;
