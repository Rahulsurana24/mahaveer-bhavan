import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

export const AdminSetup = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createAdminUser = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('create_admin_user', {
        user_email: email,
        user_role: role
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Admin user created successfully! ${email} can now access admin features.`
      });
      setEmail('');
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create admin user',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Admin Setup</h2>
          <p className="text-sm text-muted-foreground">
            Create admin users for the system
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">User Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter user's email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            User must have an existing account (signed up already)
          </p>
        </div>

        <div className="space-y-2">
          <Label>Admin Role</Label>
          <div className="flex gap-2">
            <Button
              variant={role === 'admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRole('admin')}
            >
              Admin
            </Button>
            <Button
              variant={role === 'superadmin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRole('superadmin')}
            >
              Super Admin
            </Button>
          </div>
        </div>

        <Button 
          onClick={createAdminUser} 
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Admin User'}
        </Button>

        <div className="text-xs space-y-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <span>Can manage members, events, communications</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">Super Admin</Badge>
            <span>Full access + can manage other admins</span>
          </div>
        </div>
      </div>
    </Card>
  );
};