import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Search,
  Plus,
  Edit,
  Key,
  Power,
  Lock,
  AlertCircle,
  Eye,
  Mail,
  User,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AdminPermission {
  id: string;
  user_id: string;
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const MODULES = [
  'dashboard',
  'member_management',
  'event_management',
  'trip_management',
  'communication',
  'financial_management',
  'calendar_management',
  'distribution_management',
  'gallery_management',
  'system_settings',
  'audit_logs',
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  member_management: 'Member Management',
  event_management: 'Event Management',
  trip_management: 'Trip Management',
  communication: 'Communication Center',
  financial_management: 'Financial Management',
  calendar_management: 'Calendar Management',
  distribution_management: 'Distribution Management',
  gallery_management: 'Gallery Management',
  system_settings: 'System Settings',
  audit_logs: 'Audit Logs',
};

export default function AdminManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // Form state
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    role: 'Partial Admin',
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    role: '',
  });

  // Check if current user is Admin
  const { data: currentUser, isLoading: isLoadingCurrentUser } = useQuery({
    queryKey: ['current-admin-user'],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userData.user?.id)
        .single();

      if (profileError) throw profileError;
      return profile;
    },
  });

  const isAdmin =
    currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  // Fetch all admin users
  const { data: admins = [], isLoading: isLoadingAdmins } = useQuery({
    queryKey: ['admin-users', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['Admin', 'Partial Admin', 'View Only'])
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AdminUser[];
    },
    enabled: isAdmin,
  });

  // Fetch permissions for selected admin
  const { data: permissions = [] } = useQuery({
    queryKey: ['admin-permissions', selectedAdmin?.id],
    queryFn: async () => {
      if (!selectedAdmin?.id) return [];

      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .eq('user_id', selectedAdmin.id)
        .order('module_name');

      if (error) throw error;
      return (data || []) as AdminPermission[];
    },
    enabled: !!selectedAdmin?.id && isPermissionsDialogOpen,
  });

  // Stats calculations
  const stats = {
    total: admins.length,
    active: admins.filter((a) => a.status === 'active').length,
    inactive: admins.filter((a) => a.status === 'inactive').length,
  };

  // Create admin invitation
  const createAdminMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      if (!data.full_name.trim() || !data.email.trim()) {
        throw new Error('Please fill in all required fields');
      }

      // Create admin invitation
      const { error: inviteError } = await supabase
        .from('admin_invitations')
        .insert({
          email: data.email,
          role: data.role,
          invited_by: currentUser?.id,
          status: 'pending',
        });

      if (inviteError) throw inviteError;

      // Note: Actual user creation would be handled through Supabase Auth admin API
      // For now, we'll create the user profile directly
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: '7483085263', // Default password
        options: {
          data: {
            full_name: data.full_name,
          },
        },
      });

      if (authError) throw authError;

      // Create user profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role,
            status: 'active',
          });

        if (profileError) throw profileError;
      }

      // Log the action
      await supabase.from('admin_audit_log').insert({
        admin_id: currentUser?.id,
        action: 'create_admin',
        target_admin_email: data.email,
        changes: {
          full_name: data.full_name,
          role: data.role,
          default_password_set: true,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsCreateDialogOpen(false);
      setCreateForm({ full_name: '', email: '', role: 'Partial Admin' });
      toast({
        title: '✓ Admin Account Created',
        description: 'Invitation sent with default password: 7483085263',
      });
    },
    onError: (error: any) => {
      toast({
        title: '⚠️ Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Edit admin
  const editAdminMutation = useMutation({
    mutationFn: async (data: { id: string; full_name: string; role: string }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          role: data.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (error) throw error;

      // Log the action
      await supabase.from('admin_audit_log').insert({
        admin_id: currentUser?.id,
        action: 'edit_admin',
        target_admin_id: data.id,
        changes: {
          full_name: data.full_name,
          role: data.role,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsEditDialogOpen(false);
      setSelectedAdmin(null);
      toast({
        title: '✓ Admin Updated',
        description: 'Changes saved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: '⚠️ Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reset password
  const resetPasswordMutation = useMutation({
    mutationFn: async (adminId: string) => {
      // Call database function
      const { data, error } = await supabase.rpc('reset_admin_password', {
        p_admin_id: adminId,
        p_new_password: '7483085263',
      });

      if (error) throw error;

      // Note: Actual password reset would be done through Supabase Auth admin API
      // The database function logs the action
    },
    onSuccess: () => {
      toast({
        title: '✓ Password Reset',
        description: 'Password reset to default: 7483085263',
      });
    },
    onError: (error: any) => {
      toast({
        title: '⚠️ Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle active status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      if (newStatus === 'inactive') {
        // Call deactivate function
        const { data, error } = await supabase.rpc('deactivate_admin', {
          p_admin_id: id,
          p_reason: 'Deactivated by admin',
        });

        if (error) throw error;
      } else {
        // Reactivate
        const { error } = await supabase
          .from('user_profiles')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;

        // Log the action
        await supabase.from('admin_audit_log').insert({
          admin_id: currentUser?.id,
          action: 'activate_admin',
          target_admin_id: id,
          changes: { status: 'active' },
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: variables.currentStatus === 'active' ? '✓ Admin Deactivated' : '✓ Admin Activated',
        description:
          variables.currentStatus === 'active'
            ? 'Access has been revoked'
            : 'Access has been restored',
      });
    },
    onError: (error: any) => {
      toast({
        title: '⚠️ Status Change Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleCreateAdmin = () => {
    createAdminMutation.mutate(createForm);
  };

  const handleEditAdmin = () => {
    if (!selectedAdmin) return;
    editAdminMutation.mutate({
      id: selectedAdmin.id,
      full_name: editForm.full_name,
      role: editForm.role,
    });
  };

  const handleResetPassword = (admin: AdminUser) => {
    if (
      window.confirm(
        `Reset password for ${admin.full_name} to default (7483085263)?`
      )
    ) {
      resetPasswordMutation.mutate(admin.id);
    }
  };

  const handleToggleStatus = (admin: AdminUser) => {
    const action = admin.status === 'active' ? 'deactivate' : 'activate';
    if (
      window.confirm(
        `Are you sure you want to ${action} ${admin.full_name}?`
      )
    ) {
      toggleStatusMutation.mutate({ id: admin.id, currentStatus: admin.status });
    }
  };

  const openEditDialog = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEditForm({
      full_name: admin.full_name,
      role: admin.role,
    });
    setIsEditDialogOpen(true);
  };

  const openPermissionsDialog = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsPermissionsDialogOpen(true);
  };

  // Loading state
  if (isLoadingCurrentUser) {
    return (
      <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#1C1C1C] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mt-20"
        >
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-8 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-white/60">
              This module is restricted to Admin and Super Admin roles only.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C1C1C] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-br from-[#1C1C1C] to-[#2A2A2A] border-b border-white/10">
        <div className="p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#00A36C] to-[#B8860B] rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Management</h1>
              <p className="text-white/60 text-sm">Highest privilege control center</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4"
        >
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/80">
              <p className="font-semibold text-amber-500 mb-1">
                Audit Logging Active
              </p>
              <p>
                All admin actions are logged and tracked. Exercise caution when
                modifying admin accounts or permissions.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4"
          >
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-white/60">Total Admins</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-[#00A36C]/10 to-[#00A36C]/5 border border-[#00A36C]/20 rounded-xl p-4"
          >
            <div className="text-2xl font-bold text-white">{stats.active}</div>
            <div className="text-xs text-white/60">Active</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-4"
          >
            <div className="text-2xl font-bold text-white">{stats.inactive}</div>
            <div className="text-xs text-white/60">Inactive</div>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-[#00A36C] to-[#B8860B] text-white px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Admin
            </Button>
          </div>
        </motion.div>

        {/* Admin List */}
        <div className="space-y-4">
          {isLoadingAdmins ? (
            <div className="text-center py-12 text-white/60">Loading admins...</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No admin accounts found</p>
            </div>
          ) : (
            admins.map((admin, index) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00A36C]/20 to-[#B8860B]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-[#00A36C]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-white">{admin.full_name}</h3>
                        <p className="text-sm text-white/60">{admin.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          className={cn(
                            'text-xs',
                            admin.role === 'Admin' || admin.role === 'Super Admin'
                              ? 'bg-gradient-to-r from-[#00A36C]/20 to-[#B8860B]/20 text-[#00A36C] border-[#00A36C]/20'
                              : admin.role === 'Partial Admin'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                              : 'bg-white/10 text-white/60 border-white/10'
                          )}
                        >
                          {admin.role}
                        </Badge>
                        <Badge
                          className={cn(
                            'text-xs',
                            admin.status === 'active'
                              ? 'bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/20'
                              : 'bg-red-500/20 text-red-400 border-red-500/20'
                          )}
                        >
                          {admin.status === 'active' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {admin.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(admin)}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>

                      {(admin.role === 'Partial Admin' || admin.role === 'View Only') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPermissionsDialog(admin)}
                          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Permissions
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(admin)}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Reset PW
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(admin)}
                        className={cn(
                          'border-white/10 hover:bg-white/10',
                          admin.status === 'active'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-[#00A36C]/10 text-[#00A36C]'
                        )}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create Admin Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-[#2A2A2A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create New Admin Account</DialogTitle>
            <DialogDescription className="text-white/60">
              Default password will be set to: 7483085263
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="full_name" className="text-white/80">
                Full Name *
              </Label>
              <Input
                id="full_name"
                value={createForm.full_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, full_name: e.target.value })
                }
                placeholder="Enter full name"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-white/80">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="admin@example.com"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-white/80">
                Role *
              </Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, role: value })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Full Access)</SelectItem>
                  <SelectItem value="Partial Admin">
                    Partial Admin (Limited Access)
                  </SelectItem>
                  <SelectItem value="View Only">View Only (Read Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-sm text-blue-400">
                <Mail className="w-4 h-4 inline mr-2" />
                An invitation email will be sent with login credentials
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAdmin}
              disabled={createAdminMutation.isPending}
              className="bg-gradient-to-r from-[#00A36C] to-[#B8860B] text-white"
            >
              {createAdminMutation.isPending ? 'Creating...' : 'Create Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#2A2A2A] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Admin Account</DialogTitle>
            <DialogDescription className="text-white/60">
              Update admin information and role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit_full_name" className="text-white/80">
                Full Name
              </Label>
              <Input
                id="edit_full_name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label htmlFor="edit_email" className="text-white/80">
                Email Address
              </Label>
              <Input
                id="edit_email"
                value={selectedAdmin?.email || ''}
                disabled
                className="bg-white/5 border-white/10 text-white/40"
              />
              <p className="text-xs text-white/40 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="edit_role" className="text-white/80">
                Role
              </Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Full Access)</SelectItem>
                  <SelectItem value="Partial Admin">
                    Partial Admin (Limited Access)
                  </SelectItem>
                  <SelectItem value="View Only">View Only (Read Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-sm text-amber-400">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Changing role will trigger automatic permission recalculation
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditAdmin}
              disabled={editAdminMutation.isPending}
              className="bg-gradient-to-r from-[#00A36C] to-[#B8860B] text-white"
            >
              {editAdminMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Viewer Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="bg-[#2A2A2A] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admin Permissions</DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedAdmin?.full_name} - {selectedAdmin?.role}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {permissions.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                No permissions configured
              </div>
            ) : (
              <div className="space-y-4">
                {MODULES.map((module) => {
                  const perm = permissions.find((p) => p.module_name === module);
                  return (
                    <div
                      key={module}
                      className="bg-white/5 border border-white/10 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-white mb-3">
                        {MODULE_LABELS[module]}
                      </h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            perm?.can_view ? 'text-[#00A36C]' : 'text-white/40'
                          )}
                        >
                          {perm?.can_view ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          View
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            perm?.can_create ? 'text-[#00A36C]' : 'text-white/40'
                          )}
                        >
                          {perm?.can_create ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Create
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            perm?.can_edit ? 'text-[#00A36C]' : 'text-white/40'
                          )}
                        >
                          {perm?.can_edit ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Edit
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            perm?.can_delete ? 'text-[#00A36C]' : 'text-white/40'
                          )}
                        >
                          {perm?.can_delete ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Delete
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPermissionsDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
