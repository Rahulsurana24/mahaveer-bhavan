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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, MoreHorizontal, Edit, Trash2, Shield, Mail, Calendar } from "lucide-react";

const AdminManagement = () => {
  const admins = [
    {
      id: "ADM-001",
      name: "Rajesh Sharma",
      email: "rajesh.admin@mahaveertrust.org",
      role: "superadmin",
      status: "active",
      lastLogin: "2024-01-10 09:30 AM",
      createdDate: "2023-01-15",
      permissions: ["all"]
    },
    {
      id: "ADM-002",
      name: "Priya Patel",
      email: "priya.admin@mahaveertrust.org", 
      role: "admin",
      status: "active",
      lastLogin: "2024-01-09 02:15 PM",
      createdDate: "2023-03-20",
      permissions: ["member_management", "event_management", "communications"]
    },
    {
      id: "ADM-003",
      name: "Suresh Kumar",
      email: "suresh.admin@mahaveertrust.org",
      role: "management_admin",
      status: "active",
      lastLogin: "2024-01-08 11:45 AM",
      createdDate: "2023-06-10",
      permissions: ["event_management", "financial_management"]
    },
    {
      id: "ADM-004",
      name: "Meera Shah",
      email: "meera.view@mahaveertrust.org",
      role: "view_only_admin",
      status: "inactive",
      lastLogin: "2023-12-28 04:20 PM",
      createdDate: "2023-09-05",
      permissions: ["view_only"]
    }
  ];

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

  return (
    <AdminLayout title="Admin Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Admin Management</h2>
            <p className="text-muted-foreground">Manage administrative users and their permissions</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Administrator</DialogTitle>
                <DialogDescription>
                  Create a new administrative account with specific permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin-name" className="text-right">
                    Name
                  </Label>
                  <Input id="admin-name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin-email" className="text-right">
                    Email
                  </Label>
                  <Input id="admin-email" type="email" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin-role" className="text-right">
                    Role
                  </Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select role" />
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin-notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea 
                    id="admin-notes" 
                    placeholder="Optional notes about this administrator"
                    className="col-span-3" 
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Admin Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                {admins.filter(admin => admin.role === role.value).length} active
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
                  />
                </div>
              </div>
              <Select>
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
              <Select>
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
            <CardTitle>Administrators ({admins.length})</CardTitle>
          </CardHeader>
          <CardContent>
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
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{admin.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {admin.email}
                        </div>
                        <div className="text-xs text-muted-foreground">{admin.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(admin.role)}</TableCell>
                    <TableCell>{getStatusBadge(admin.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {admin.lastLogin}
                      </div>
                    </TableCell>
                    <TableCell>{admin.createdDate}</TableCell>
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
                          <DropdownMenuItem className="text-destructive">
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminManagement;