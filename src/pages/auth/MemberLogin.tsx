import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Loading } from '@/components/ui/loading';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

type LoginFormData = z.infer<typeof loginSchema>;

const MemberLogin = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur'
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D]">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  // Redirect authenticated users
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: 'Email Not Verified',
            description: 'Please check your email and click the verification link before signing in.',
            variant: 'destructive'
          });
        } else if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Login Failed',
            description: 'Invalid email or password. Please try again.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Login Failed',
            description: error.message,
            variant: 'destructive'
          });
        }
        return;
      }

      // Check if user needs to change password
      if (user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('is_first_login')
          .eq('auth_id', user.id)
          .single();

        if (memberData?.is_first_login) {
          navigate('/auth/password-management');
          return;
        }
      }

      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.'
      });

      // Redirect happens automatically via auth context
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] flex flex-col p-4">
      {/* Header */}
      <div className="w-full max-w-md mx-auto pt-8 pb-6">
        <Button
          onClick={() => navigate('/auth/welcome')}
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-white/10 mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-4 border-2 border-[#00A36C]">
            <img
              src="/lovable-uploads/b6ff16cc-cf72-4a45-807f-fe1e91fcd72d.png"
              alt="Sree Mahaveer Seva Logo"
              className="w-16 h-16 rounded-full"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-start justify-center w-full max-w-md mx-auto">
        <Card className="w-full bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 pl-10"
                    placeholder="your.email@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 pl-10 pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    {...register('rememberMe')}
                    className="border-white/20 data-[state=checked]:bg-[#00A36C]"
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm text-gray-300 cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-[#00A36C] hover:text-[#008F5C] p-0 h-auto"
                  onClick={() => navigate('/auth/forgot-password')}
                >
                  Forgot password?
                </Button>
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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#1C1C1C] text-gray-400">
                    New to Sree Mahaveer Seva?
                  </span>
                </div>
              </div>

              {/* Register Link */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => navigate('/auth/register')}
              >
                Create an Account
              </Button>

              {/* Admin Link */}
              <div className="text-center pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                  onClick={() => navigate('/admin/auth')}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Administrator Access
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto pt-6 pb-8 text-center text-sm text-gray-400">
        <p>© 2024 Sree Mahaveer Swami Charitable Trust</p>
        <p className="mt-1">All rights reserved</p>
      </div>
    </div>
  );
};

export default MemberLogin;
