import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PASSWORD = "7483085263";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full system access (manage members, events, communications)",
  superadmin: "Complete system control (manage admins, system settings)",
  management_admin: "Event and member management only",
  view_only_admin: "Read-only access to all modules"
};

export function CreateAdminDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset password to default when dialog opens
  useEffect(() => {
    if (open) {
      setPassword(DEFAULT_PASSWORD);
    }
  }, [open]);

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .in('name', ['admin', 'superadmin', 'management_admin', 'view_only_admin']);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('[CreateAdmin] Starting admin creation for:', data.email);
      
      // Create auth user with email and password using signUp (client-side compatible)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName
          },
          emailRedirectTo: window.location.origin
        }
      });
      
      if (authError) {
        console.error('[CreateAdmin] Auth signup error:', authError);
        throw new Error(`Signup failed: ${authError.message}`);
      }
      
      if (!authData.user) {
        console.error('[CreateAdmin] No user returned from signup');
        throw new Error('User creation failed - no user returned');
      }

      console.log('[CreateAdmin] Auth user created:', authData.user.id);

      // Wait a moment for the user profile to be created by trigger
      console.log('[CreateAdmin] Waiting for profile trigger...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds

      // Check if profile was created
      console.log('[CreateAdmin] Checking if profile exists...');
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id, auth_id, email, role_id')
        .eq('auth_id', authData.user.id)
        .maybeSingle();

      if (checkError) {
        console.error('[CreateAdmin] Error checking profile:', checkError);
        throw new Error(`Profile check failed: ${checkError.message}`);
      }

      if (!existingProfile) {
        console.error('[CreateAdmin] Profile not created by trigger');
        throw new Error('User profile was not created automatically. Please contact support.');
      }

      console.log('[CreateAdmin] Profile found:', existingProfile);

      // Try using the RPC function first (more reliable)
      console.log('[CreateAdmin] Attempting to update role via RPC function...');
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('update_user_role', {
          p_user_auth_id: authData.user.id,
          p_role_id: data.roleId
        });

      if (rpcError) {
        console.warn('[CreateAdmin] RPC update failed:', rpcError.message);
        console.log('[CreateAdmin] Falling back to direct UPDATE...');
        
        // Fallback to direct update
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            role_id: data.roleId, 
            needs_password_change: true,
            full_name: data.fullName
          })
          .eq('auth_id', authData.user.id);
          
        if (profileError) {
          console.error('[CreateAdmin] Direct UPDATE failed:', profileError);
          throw new Error(`Failed to update profile: ${profileError.message}. Please ensure you have admin permissions.`);
        }
        
        console.log('[CreateAdmin] Direct UPDATE succeeded');
      } else {
        console.log('[CreateAdmin] RPC update succeeded:', rpcResult);
        
        // Still need to update needs_password_change and full_name
        const { error: extraUpdateError } = await supabase
          .from('user_profiles')
          .update({ 
            needs_password_change: true,
            full_name: data.fullName
          })
          .eq('auth_id', authData.user.id);
          
        if (extraUpdateError) {
          console.warn('[CreateAdmin] Could not update additional fields:', extraUpdateError.message);
          // Don't throw - the role was updated successfully which is critical
        }
      }

      console.log('[CreateAdmin] Admin creation complete!');
      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-counts'] });
      toast({
        title: "Success",
        description: `Admin created successfully! Default password: ${DEFAULT_PASSWORD}`,
      });
      setOpen(false);
      setEmail("");
      setPassword(DEFAULT_PASSWORD);
      setFullName("");
      setRoleId("");
    },
    onError: (error: any) => {
      console.error('[CreateAdmin] Final error:', error);
      toast({
        title: "Admin Creation Failed",
        description: error.message || "An unexpected error occurred. Check console for details.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleId) {
      toast({
        title: "Error",
        description: "Please select an admin role",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ email, password, fullName, roleId });
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPassword = "";
    for (let i = 0; i < length; i++) {
      newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(newPassword);
    toast({
      title: "Password Generated",
      description: "A secure random password has been generated",
    });
  };

  const resetToDefault = () => {
    setPassword(DEFAULT_PASSWORD);
    toast({
      title: "Password Reset",
      description: `Password reset to default: ${DEFAULT_PASSWORD}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Shield className="h-4 w-4 mr-2" />
          Create Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Admin User</DialogTitle>
          <DialogDescription>
            Add a new administrator with specific role and permissions
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Admin Role *</Label>
            <Select value={roleId} onValueChange={setRoleId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select admin role" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ROLE_DESCRIPTIONS[role.name]}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Initial Password *</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="flex-1 font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generateRandomPassword}
                title="Generate random password"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Default password: {DEFAULT_PASSWORD} (visible to admin, share securely with new user)
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetToDefault}
              className="text-xs"
            >
              Reset to Default Password
            </Button>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              <strong>Security Note:</strong> The admin will be prompted to change their password on first login.
              Make sure to securely communicate the initial password to them.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Admin"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
