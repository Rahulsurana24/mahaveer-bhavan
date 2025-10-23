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
      // Create auth user with email and password
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName }
      });
      if (authError) throw authError;

      // Update user profile with admin role
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ role_id: data.roleId, needs_password_change: true })
        .eq('email', data.email);
      if (profileError) throw profileError;

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
      toast({
        title: "Error",
        description: error.message,
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
