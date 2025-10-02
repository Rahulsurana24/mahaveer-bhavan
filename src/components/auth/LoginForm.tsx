import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional()
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
}

export const LoginForm = ({ onSignUpClick, onForgotPasswordClick }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange'
  });

  const email = watch('email');
  const password = watch('password');
  const isFormValid = email && password && !errors.email && !errors.password;

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        // Handle email not confirmed error
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: 'Email Not Verified',
            description: 'Please check your email and click the verification link before signing in.',
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

      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.'
      });
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          {...register('email')}
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            {...register('password')}
            className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            {...register('rememberMe')}
          />
          <Label htmlFor="rememberMe" className="text-sm font-normal">
            Remember me
          </Label>
        </div>
        <Button
          type="button"
          variant="link"
          className="px-0 font-normal"
          onClick={onForgotPasswordClick}
        >
          Forgot password?
        </Button>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !isFormValid}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onSignUpClick}
          className="text-primary hover:underline font-medium transition-colors"
        >
          Sign up
        </button>
        
        <button
          type="button"
          onClick={() => navigate('/admin/auth')}
          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          <ShieldCheck className="h-3 w-3" />
          Admin
        </button>
      </div>
    </form>
  );
};