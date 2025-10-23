import { useState } from "react";
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
import { Search, MoreHorizontal, Edit, Trash2, Shield, Mail, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { CreateAdminDialog } from "@/components/admin/CreateAdminDialog";

const AdminManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch admins from database
  const { data: admins, isLoading } = useQuery({
    queryKey: ['admin-admins', searchTerm, roleFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select(`
          *,
          user_roles(*)
        `)
        .order('created_at', { ascending: false });

      // Filter by admin roles only
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('id')
        .in('name', ['admin', 'superadmin', 'management_admin', 'view_only_admin']);
      
      if (roleData) {
        const roleIds = roleData.map(r => r.id);
        query = query.in('role_id', roleIds);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (roleFilter !== 'all' && roleData) {
        const filteredRole = roleData.find(r => r.name === roleFilter);
        if (filteredRole) {
          query = query.eq('role_id', filteredRole.id);
        }
      }

      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        query = query.eq('is_active', isActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Fetch role counts
  const { data: roleCounts } = useQuery({
    queryKey: ['admin-role-counts'],
    queryFn: async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('id, name')
        .in('name', ['admin', 'superadmin', 'management_admin', 'view_only_admin']);

      if (!roleData) return {};

      const counts: Record<string, number> = {};
      for (const role of roleData) {
        const { count } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role_id', role.id)
          .eq('is_active', true);
        counts[role.name] = count || 0;
      }
      return counts;
    }
  });

  // Delete admin mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Deactivate instead of delete
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-counts'] });
      toast({
        title: "Admin deactivated",
        description: "Administrator has been deactivated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to deactivate admin: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleDelete = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to deactivate ${userName}?`)) {
      deleteMutation.mutate(userId);
    }
  };

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
      description: "Complete management access",
      color: "bg-blue-500"
    },
    { 
      value: "management_admin", 
      label: "Management Admin", 
      description: "Event and financial management",
      color: "bg-green-500"
    },
    { 
      value: "view_only_admin", 
      label: "View Only", 
      description: "Read-only access to all sections",
      color: "bg-gray-500"
    }
  ];

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const getRoleBadge = (roleName: string) => {
    const roleInfo = roles.find(r => r.value === roleName);
    if (!roleInfo) return <Badge variant="outline">{roleName}</Badge>;
    
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${roleInfo.color}`} />
        {roleInfo.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout title="Admin Management">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" text="Loading administrators..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Admin Management</h2>
            <p className="text-muted-foreground">Manage administrative users and their permissions</p>
          </div>
          <CreateAdminDialog />
        </div>

        {/* Role Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => (
            <Card key={role.value} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${role.color}`} />
                <h4 className="font-medium">{role.label}</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
              <div className="text-xs text-muted-foreground">
                {roleCounts?.[role.value] || 0} active
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
            <CardTitle>Administrators ({admins?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!admins || admins.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No administrators found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first administrator'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin: any) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{admin.full_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {admin.email}
                          </div>
                          <div className="text-xs text-muted-foreground">{admin.id.substring(0, 8)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(admin.user_roles?.name)}</TableCell>
                      <TableCell>{getStatusBadge(admin.is_active)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {admin.last_login ? new Date(admin.last_login).toLocaleString() : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="mr-2 h-4 w-4" />
                              Manage Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(admin.id, admin.full_name)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate Admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminManagement;