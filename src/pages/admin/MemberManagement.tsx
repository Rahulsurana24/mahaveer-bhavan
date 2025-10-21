import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Download, MoreHorizontal, Edit, Trash2, Filter, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const MemberManagement = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [membershipTypeFilter, setMembershipTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    membership_type: "Extra",
    status: "active",
    date_of_birth: "",
    gender: "male",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchTerm, membershipTypeFilter, statusFilter, members, activeTab]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (membershipTypeFilter !== "all") {
      filtered = filtered.filter(member => member.membership_type === membershipTypeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    // Filter by active tab
    if (activeTab === "pending") {
      filtered = filtered.filter(member => member.status === "pending_approval");
    } else if (activeTab === "active") {
      filtered = filtered.filter(member => member.status === "active");
    } else if (activeTab === "rejected") {
      filtered = filtered.filter(member => member.status === "rejected");
    } else if (activeTab === "inactive") {
      filtered = filtered.filter(member => member.status === "inactive" || member.status === "suspended");
    }

    setFilteredMembers(filtered);
  };

  const generateMemberId = async (membershipType: string) => {
    const prefixMap: Record<string, string> = {
      Trustee: "TR",
      Tapasvi: "TP",
      Karyakarta: "KR",
      Labharti: "LB",
      Extra: "EX",
    };
    const prefix = prefixMap[membershipType] || "EX";
    
    const { data } = await supabase
      .from('members')
      .select('id')
      .like('id', `${prefix}-%`)
      .order('id', { ascending: false })
      .limit(1);

    let counter = 1;
    if (data && data.length > 0) {
      const lastId = data[0].id;
      const lastCounter = parseInt(lastId.split('-')[1]);
      counter = lastCounter + 1;
    }

    return `${prefix}-${counter.toString().padStart(3, '0')}`;
  };

  const handleCreateMember = async () => {
    try {
      const memberId = await generateMemberId(formData.membership_type);
      
      const { error } = await supabase
        .from('members')
        .insert([{
          id: memberId,
          ...formData,
          photo_url: '/placeholder.svg',
          emergency_contact: {},
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member created successfully",
      });
      
      setIsCreateDialogOpen(false);
      resetForm();
      fetchMembers();
    } catch (error: any) {
      console.error('Error creating member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create member",
        variant: "destructive",
      });
    }
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from('members')
        .update(formData)
        .eq('id', selectedMember.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member updated successfully",
      });
      
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      resetForm();
      fetchMembers();
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update member",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member deleted successfully",
      });
      fetchMembers();
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete member",
        variant: "destructive",
      });
    }
  };

  const handleApproveMember = async () => {
    if (!selectedMember || !user) return;

    try {
      const { error } = await supabase.rpc('approve_member', {
        p_member_id: selectedMember.id,
        p_approved_by: user.id
      });

      if (error) throw error;

      toast({
        title: "Member Approved",
        description: `${selectedMember.full_name} has been approved successfully.`,
      });

      setIsApproveDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error: any) {
      console.error('Error approving member:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve member",
        variant: "destructive",
      });
    }
  };

  const handleRejectMember = async () => {
    if (!selectedMember || !user || !rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Rejection reason is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('reject_member', {
        p_member_id: selectedMember.id,
        p_rejected_by: user.id,
        p_rejection_reason: rejectionReason.trim()
      });

      if (error) throw error;

      toast({
        title: "Member Rejected",
        description: `${selectedMember.full_name} has been rejected.`,
      });

      setIsRejectDialogOpen(false);
      setSelectedMember(null);
      setRejectionReason("");
      fetchMembers();
    } catch (error: any) {
      console.error('Error rejecting member:', error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject member",
        variant: "destructive",
      });
    }
  };

  const openApproveDialog = (member: any) => {
    setSelectedMember(member);
    setIsApproveDialogOpen(true);
  };

  const openRejectDialog = (member: any) => {
    setSelectedMember(member);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const openEditDialog = (member: any) => {
    setSelectedMember(member);
    setFormData({
      full_name: member.full_name || "",
      email: member.email || "",
      phone: member.phone || "",
      membership_type: member.membership_type || "Extra",
      status: member.status || "active",
      date_of_birth: member.date_of_birth || "",
      gender: member.gender || "male",
      address: member.address || "",
      city: member.city || "",
      state: member.state || "",
      postal_code: member.postal_code || "",
      country: member.country || "India",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      membership_type: "Extra",
      status: "active",
      date_of_birth: "",
      gender: "male",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "India",
    });
  };

  const exportMembers = () => {
    const csv = [
      ['ID', 'Name', 'Email', 'Phone', 'Membership Type', 'Status', 'Join Date'],
      ...filteredMembers.map(m => [
        m.id,
        m.full_name,
        m.email,
        m.phone,
        m.membership_type,
        m.status,
        format(new Date(m.created_at), 'yyyy-MM-dd')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members.csv';
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive",
      pending_approval: "outline",
      rejected: "destructive",
    };
    const icons: Record<string, any> = {
      active: CheckCircle,
      pending_approval: Clock,
      rejected: XCircle,
      inactive: User,
      suspended: XCircle,
    };
    const Icon = icons[status] || User;
    return (
      <Badge variant={variants[status] || "secondary"} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status === "pending_approval" ? "Pending" : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getMembershipBadge = (type: string) => {
    const colors: Record<string, string> = {
      Trustee: "bg-purple-500",
      Tapasvi: "bg-blue-500",
      Karyakarta: "bg-green-500",
      Labharti: "bg-yellow-500",
      Extra: "bg-gray-500",
    };
    return (
      <Badge className={`${colors[type] || colors.Extra} text-white`}>
        {type}
      </Badge>
    );
  };

  const getPendingCount = () => members.filter(m => m.status === "pending_approval").length;
  const getActiveCount = () => members.filter(m => m.status === "active").length;
  const getRejectedCount = () => members.filter(m => m.status === "rejected").length;
  const getInactiveCount = () => members.filter(m => m.status === "inactive" || m.status === "suspended").length;

  if (loading) {
    return (
      <AdminLayout title="Member Management">
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Member Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h2 className="text-2xl font-bold">Member Management</h2>
            <p className="text-muted-foreground">Manage and view all trust members</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportMembers}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={membershipTypeFilter} onValueChange={setMembershipTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Membership Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Trustee">Trustee</SelectItem>
                  <SelectItem value="Tapasvi">Tapasvi</SelectItem>
                  <SelectItem value="Karyakarta">Karyakarta</SelectItem>
                  <SelectItem value="Labharti">Labharti</SelectItem>
                  <SelectItem value="Extra">Extra</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Members Tabs and Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending Approval
              {getPendingCount() > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {getPendingCount()}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({getActiveCount()})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({getRejectedCount()})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({getInactiveCount()})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "all" && "All Members"}
                  {activeTab === "pending" && "Pending Approvals"}
                  {activeTab === "active" && "Active Members"}
                  {activeTab === "rejected" && "Rejected Members"}
                  {activeTab === "inactive" && "Inactive Members"}
                  {" "}({filteredMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTab === "pending" && filteredMembers.length > 0 && (
                  <Alert className="mb-4">
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      {filteredMembers.length} member{filteredMembers.length > 1 ? 's' : ''} awaiting your approval
                    </AlertDescription>
                  </Alert>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Membership</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No members found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-mono text-sm">{member.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{member.full_name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{member.email}</p>
                                <p className="text-muted-foreground">{member.phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getMembershipBadge(member.membership_type)}</TableCell>
                            <TableCell>{getStatusBadge(member.status)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{format(new Date(member.created_at), 'MMM dd, yyyy')}</p>
                                {member.status === "rejected" && member.rejection_reason && (
                                  <p className="text-xs text-destructive">Reason: {member.rejection_reason}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.status === "pending_approval" && (
                                    <>
                                      <DropdownMenuItem onClick={() => openApproveDialog(member)} className="text-green-600">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openRejectDialog(member)} className="text-destructive">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem onClick={() => openEditDialog(member)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteMember(member.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
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
          </TabsContent>
        </Tabs>

        {/* Approve Member Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this member?
              </DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Member Details:</p>
                  <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedMember.full_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedMember.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedMember.phone}</p>
                    <p><span className="font-medium">Membership Type:</span> {selectedMember.membership_type}</p>
                  </div>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    The member will be notified via email and can access all features.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApproveMember} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Member Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Member</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejection. This will be shared with the member.
              </DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Member: {selectedMember.full_name}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                  <Textarea
                    id="rejection_reason"
                    placeholder="Enter reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                  />
                </div>
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    The member will be notified with this reason.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRejectMember} 
                variant="destructive"
                disabled={!rejectionReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Member Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>Fill in the member details below</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="membership_type">Membership Type</Label>
                <Select value={formData.membership_type} onValueChange={(value) => setFormData({ ...formData, membership_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Trustee">Trustee</SelectItem>
                    <SelectItem value="Tapasvi">Tapasvi</SelectItem>
                    <SelectItem value="Karyakarta">Karyakarta</SelectItem>
                    <SelectItem value="Labharti">Labharti</SelectItem>
                    <SelectItem value="Extra">Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMember}>Create Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>Update member details below</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full Name *</Label>
                <Input
                  id="edit_full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email *</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone *</Label>
                <Input
                  id="edit_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit_address">Address</Label>
                <Input
                  id="edit_address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_city">City</Label>
                <Input
                  id="edit_city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_state">State</Label>
                <Input
                  id="edit_state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditMember}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default MemberManagement;
