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

const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid admin email address'),
  password: z.string().min(1, 'Password is required'),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export const AdminLoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
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
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        toast({
          title: 'Admin Login Failed',
          description: error.message || 'Invalid admin credentials',
          variant: 'destructive'
        });
        return;
      }

      // Success handled by auth context redirect
    } catch (error: any) {
      toast({
        title: 'Admin Login Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
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
  );
};
