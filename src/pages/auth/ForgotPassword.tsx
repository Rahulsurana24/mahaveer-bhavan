import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/auth/password-management?type=recovery`
        }
      );

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      setSentEmail(data.email);
      setEmailSent(true);

      toast({
        title: 'Email Sent',
        description: 'Check your email for password reset instructions'
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/auth/login')}
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-4 border-2 border-[#00A36C]">
              {emailSent ? (
                <CheckCircle2 className="h-10 w-10 text-[#00A36C]" />
              ) : (
                <Mail className="h-10 w-10 text-[#00A36C]" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {emailSent ? 'Check Your Email' : 'Forgot Password?'}
            </h1>
            <p className="text-gray-400">
              {emailSent
                ? 'We\'ve sent you a password reset link'
                : 'No worries, we\'ll send you reset instructions'}
            </p>
          </div>
        </div>

        {!emailSent ? (
          // Request Form
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Reset Your Password</CardTitle>
              <CardDescription className="text-gray-400">
                Enter your email address and we'll send you a link to reset your password
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                      autoFocus
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-[#00A36C] hover:bg-[#008F5C] text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          // Success Card
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6 space-y-4">
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-sm text-gray-300">
                  <p className="font-semibold mb-1">Email sent successfully!</p>
                  <p>We've sent a password reset link to:</p>
                  <p className="text-[#00A36C] font-medium mt-1">{sentEmail}</p>
                </AlertDescription>
              </Alert>

              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-medium text-sm mb-2">What's Next?</h4>
                <ol className="text-sm text-gray-300 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-[#00A36C] font-bold">1.</span>
                    <span>Check your email inbox</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#00A36C] font-bold">2.</span>
                    <span>Click the reset link in the email</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#00A36C] font-bold">3.</span>
                    <span>Create a new password</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#00A36C] font-bold">4.</span>
                    <span>Sign in with your new password</span>
                  </li>
                </ol>
              </div>

              <div className="text-center text-sm text-gray-400 space-y-2">
                <p>Didn't receive the email?</p>
                <Button
                  variant="link"
                  className="text-[#00A36C] hover:text-[#008F5C] p-0 h-auto"
                  onClick={() => setEmailSent(false)}
                >
                  Try again
                </Button>
                <p className="text-xs">Check your spam folder or contact support</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <Button
            onClick={() => navigate('/auth/login')}
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            Return to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
