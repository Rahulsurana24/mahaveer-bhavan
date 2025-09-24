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
import { Search, Plus, Download, MoreHorizontal, Mail, Phone, Edit, Trash2 } from "lucide-react";

const MemberManagement = () => {
  const members = [
    {
      id: "KR-001",
      name: "Raj Patel",
      email: "raj.patel@email.com",
      phone: "+91 98765 43210",
      membershipType: "Karyakarta",
      status: "active",
      joinDate: "2023-05-15",
      lastLogin: "2024-01-10"
    },
    {
      id: "TP-001",
      name: "Meera Shah",
      email: "meera.shah@email.com",
      phone: "+91 98765 43211",
      membershipType: "Tapasvi",
      status: "active",
      joinDate: "2023-03-20",
      lastLogin: "2024-01-09"
    },
    {
      id: "LB-001",
      name: "Suresh Kumar",
      email: "suresh.kumar@email.com",
      phone: "+91 98765 43212",
      membershipType: "Labharti",
      status: "inactive",
      joinDate: "2023-08-10",
      lastLogin: "2023-12-15"
    }
  ];

  const getStatusBadge = (status: string) => {
    return status === "active" ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const getMembershipBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Trustee": "default",
      "Tapasvi": "secondary",
      "Karyakarta": "outline",
      "Labharti": "destructive"
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
  };

  return (
    <AdminLayout title="Member Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Member Management</h2>
            <p className="text-muted-foreground">Manage trust members and their information</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members by name, email, or ID..."
                    className="pl-9"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Membership Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="trustee">Trustee</SelectItem>
                  <SelectItem value="tapasvi">Tapasvi</SelectItem>
                  <SelectItem value="karyakarta">Karyakarta</SelectItem>
                  <SelectItem value="labharti">Labharti</SelectItem>
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

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono">{member.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span className="text-sm">{member.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getMembershipBadge(member.membershipType)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>{member.joinDate}</TableCell>
                    <TableCell>{member.lastLogin}</TableCell>
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
                            Edit Member
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Member
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

export default MemberManagement;