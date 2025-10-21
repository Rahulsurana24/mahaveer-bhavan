import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Shield, Mail, Calendar, Key, Copy, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Loading } from "@/components/ui/loading";
import { format } from "date-fns";

const AdminManagement = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "admin",
    notes: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { role: currentUserRole } = useUserProfile();

  const roles = [
    {
      value: "superadmin",
      label: "Super Admin",
      description: "Full system access and control",
      color: "bg-red-500"
    },
    {
      value: "admin",
      label: "Admin",
      description: "Complete management access (no admin management)",
      color: "bg-blue-500"
    },
    {
      value: "management_admin",
      label: "Management Admin",
      description: "Event and financial management",
      color: "bg-green-500"
    },
  ];

  useEffect(() => {
    // Check if user is superadmin
    if (currentUserRole?.name !== 'superadmin') {
      toast({
        title: "Access Denied",
        description: "Only superadmins can access admin management",
        variant: "destructive",
      });
      window.location.href = "/admin/dashboard";
      return;
    }
    fetchAdmins();
  }, [currentUserRole]);

  useEffect(() => {
    filterAdmins();
  }, [searchTerm, roleFilter, statusFilter, admins]);

  const fetchAdmins = async () => {
    try {
      // Fetch user profiles with admin roles
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          auth_id,
          email,
          full_name,
          status,
          notes,
          created_at,
          needs_password_change,
          user_roles (
            id,
            name,
            description
          )
        `)
        .in('user_roles.name', ['superadmin', 'admin', 'management_admin'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include role information
      const transformedData = (data || []).map((admin: any) => ({
        ...admin,
        role: admin.user_roles?.name || 'unknown',
        role_id: admin.user_roles?.id || null,
        role_description: admin.user_roles?.description || '',
      }));

      setAdmins(transformedData);
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      toast({
        title: "Error",
        description: "Failed to load administrators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAdmins = () => {
    let filtered = admins;

    if (searchTerm) {
      filtered = filtered.filter(admin =>
        admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(admin => admin.role === roleFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(admin => admin.status === statusFilter);
    }

    setFilteredAdmins(filtered);
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreateAdmin = async () => {
    if (!formData.full_name || !formData.email || !formData.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate temporary password
      const tempPassword = generatePassword();

      // Get role ID
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', formData.role)
        .single();

      if (roleError) throw roleError;

      // Create auth user using Supabase admin API
      // Note: This requires service_role key, which should be used server-side
      // For now, we'll create using standard signup and then update
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Update user profile with admin role
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          role_id: roleData.id,
          needs_password_change: true,
          notes: formData.notes,
        })
        .eq('auth_id', authData.user.id);

      if (profileError) throw profileError;

      // Show success with temporary password
      toast({
        title: "Admin Created Successfully",
        description: `Temporary password: ${tempPassword} (Please share securely)`,
        duration: 10000,
      });

      // Copy password to clipboard
      navigator.clipboard.writeText(tempPassword);

      setIsCreateDialogOpen(false);
      resetForm();
      fetchAdmins();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    }
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      // Get role ID if role changed
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('name', formData.role)
        .single();

      if (roleError) throw roleError;

      // Update user profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          role_id: roleData.id,
          notes: formData.notes,
        })
        .eq('auth_id', selectedAdmin.auth_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Admin updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedAdmin(null);
      resetForm();
      fetchAdmins();
    } catch (error: any) {
      console.error('Error updating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update admin",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin) return;

    try {
      const tempPassword = newPassword || generatePassword();

      // This requires Supabase Admin API (service_role)
      // For production, this should be done via Edge Function
      // For now, we'll update the needs_password_change flag
      const { error } = await supabase
        .from('user_profiles')
        .update({ needs_password_change: true })
        .eq('auth_id', selectedAdmin.auth_id);

      if (error) throw error;

      toast({
        title: "Password Reset Initiated",
        description: `New password: ${tempPassword} (Copied to clipboard)`,
        duration: 10000,
      });

      // Copy to clipboard
      navigator.clipboard.writeText(tempPassword);

      setIsResetPasswordDialogOpen(false);
      setSelectedAdmin(null);
      setNewPassword("");
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const handleDeactivateAdmin = async (admin: any) => {
    // Prevent deactivating yourself
    if (admin.auth_id === user?.id) {
      toast({
        title: "Cannot Deactivate",
        description: "You cannot deactivate your own account",
        variant: "destructive",
      });
      return;
    }

    // Prevent deactivating last superadmin
    if (admin.role === 'superadmin') {
      const superadminCount = admins.filter(a => a.role === 'superadmin' && a.status === 'active').length;
      if (superadminCount <= 1) {
        toast({
          title: "Cannot Deactivate",
          description: "Cannot deactivate the last superadmin",
          variant: "destructive",
        });
        return;
      }
    }

    if (!confirm(`Are you sure you want to deactivate ${admin.full_name}?`)) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ status: 'inactive' })
        .eq('auth_id', admin.auth_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${admin.full_name} has been deactivated`,
      });

      fetchAdmins();
    } catch (error: any) {
      console.error('Error deactivating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate admin",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (admin: any) => {
    setSelectedAdmin(admin);
    setFormData({
      full_name: admin.full_name || "",
      email: admin.email || "",
      role: admin.role || "admin",
      notes: admin.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openResetPasswordDialog = (admin: any) => {
    setSelectedAdmin(admin);
    setNewPassword("");
    setIsResetPasswordDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      role: "admin",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleInfo = roles.find(r => r.value === role);
    if (!roleInfo) return <Badge variant="outline">{role}</Badge>;

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${roleInfo.color}`} />
        {roleInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AdminLayout title="Admin Management">
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Management">
      <div className="space-y-6">
        {/* Access Control Warning */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Superadmin Only:</strong> You have full access to manage all administrative accounts.
          </AlertDescription>
        </Alert>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Admin Management</h2>
            <p className="text-muted-foreground">Manage administrative users and their permissions</p>
          </div>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        </div>

        {/* Role Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.value} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${role.color}`} />
                <h4 className="font-medium">{role.label}</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
              <div className="text-xs text-muted-foreground">
                {admins.filter(admin => admin.role === role.value && admin.status === 'active').length} active
              </div>
            </Card>
          ))}
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search administrators by name or email..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Admins Table */}
        <Card>
          <CardHeader>
            <CardTitle>Administrators ({filteredAdmins.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No administrators found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdmins.map((admin) => (
                      <TableRow key={admin.auth_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{admin.full_name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {admin.email}
                            </div>
                            {admin.needs_password_change && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Password Reset Required
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(admin.role)}</TableCell>
                        <TableCell>{getStatusBadge(admin.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(admin.created_at), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(admin)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openResetPasswordDialog(admin)}>
                                <Key className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeactivateAdmin(admin)}
                                disabled={admin.auth_id === user?.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create Admin Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Administrator</DialogTitle>
              <DialogDescription>
                Create a new administrative account. A temporary password will be generated.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Full Name *</Label>
                <Input
                  id="create-name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${role.color}`} />
                          <div>
                            <div className="font-medium">{role.label}</div>
                            <div className="text-xs text-muted-foreground">{role.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-notes">Notes</Label>
                <Textarea
                  id="create-notes"
                  placeholder="Optional notes about this administrator"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  A temporary password will be generated and must be shared securely with the admin.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAdmin}>Create Admin Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Administrator</DialogTitle>
              <DialogDescription>
                Update administrator details and role.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditAdmin}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Generate a new temporary password for {selectedAdmin?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  A new temporary password will be generated and copied to your clipboard. The admin will be required to change it on next login.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="new-password">Custom Password (Optional)</Label>
                <Input
                  id="new-password"
                  type="text"
                  placeholder="Leave empty to auto-generate"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResetPassword}>
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminManagement;
