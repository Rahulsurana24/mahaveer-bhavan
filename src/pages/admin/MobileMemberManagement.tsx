import { useEffect, useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const MobileMemberManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    membership_type: 'Extra',
    status: 'active',
    date_of_birth: '',
    gender: 'male',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch members with filters
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['mobile-members', searchTerm, membershipTypeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`
        );
      }

      if (membershipTypeFilter !== 'all') {
        query = query.eq('membership_type', membershipTypeFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Count statistics
  const { data: stats } = useQuery({
    queryKey: ['mobile-member-stats'],
    queryFn: async () => {
      const { count: totalCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      return { totalCount, activeCount };
    },
  });

  const generateMemberId = async (membershipType: string) => {
    const prefixMap: Record<string, string> = {
      Trustee: 'TR',
      Tapasvi: 'T',
      Karyakarta: 'K',
      Labharti: 'L',
      Extra: 'E',
    };
    const prefix = prefixMap[membershipType] || 'E';

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

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Validate required fields
      if (!data.full_name || !data.email || !data.phone || !data.date_of_birth || !data.address) {
        throw new Error('Please fill in all required fields');
      }

      // Check if email already exists
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingMember) {
        throw new Error('A member with this email already exists');
      }

      const memberId = await generateMemberId(data.membership_type);

      const { error } = await supabase.from('members').insert([
        {
          id: memberId,
          ...data,
          photo_url: '/placeholder.svg',
          emergency_contact: {},
        },
      ]);

      if (error) throw error;
      return memberId;
    },
    onSuccess: (memberId) => {
      queryClient.invalidateQueries({ queryKey: ['mobile-members'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-member-stats'] });
      toast({
        title: '✓ Member Created',
        description: `Member ID: ${memberId}`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Edit member mutation
  const editMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('members').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-members'] });
      toast({
        title: '✓ Member Updated',
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-members'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-member-stats'] });
      toast({
        title: '✓ Member Deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeleteMember = (memberId: string, memberName: string) => {
    if (confirm(`Delete ${memberName}? This action cannot be undone.`)) {
      deleteMemberMutation.mutate(memberId);
    }
  };

  const openEditDialog = (member: any) => {
    setSelectedMember(member);
    setFormData({
      full_name: member.full_name || '',
      email: member.email || '',
      phone: member.phone || '',
      membership_type: member.membership_type || 'Extra',
      status: member.status || 'active',
      date_of_birth: member.date_of_birth || '',
      gender: member.gender || 'male',
      address: member.address || '',
      city: member.city || '',
      state: member.state || '',
      postal_code: member.postal_code || '',
      country: member.country || 'India',
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      membership_type: 'Extra',
      status: 'active',
      date_of_birth: '',
      gender: 'male',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
    });
  };

  const exportMembers = () => {
    const csv = [
      ['ID', 'Name', 'Email', 'Phone', 'Membership Type', 'Status', 'Join Date'],
      ...members.map((m: any) => [
        m.id,
        m.full_name,
        m.email,
        m.phone,
        m.membership_type,
        m.status,
        format(new Date(m.created_at), 'yyyy-MM-dd'),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getMembershipBadge = (type: string) => {
    const colors: Record<string, string> = {
      Trustee: 'bg-purple-500',
      Tapasvi: 'bg-blue-500',
      Karyakarta: 'bg-[#00A36C]',
      Labharti: 'bg-[#B8860B]',
      Extra: 'bg-gray-500',
    };
    return (
      <Badge className={cn(colors[type] || colors.Extra, 'text-white border-0')}>
        {type}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', className: 'bg-[#00A36C] border-0' },
      inactive: { variant: 'secondary', className: '' },
      suspended: { variant: 'destructive', className: '' },
    };
    const config = variants[status] || variants.inactive;
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <MobileLayout title="Member Management">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Member Management">
      <div className="px-4 py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-white">{stats?.totalCount || 0}</div>
              <div className="text-xs text-gray-400">Total Members</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-[#00A36C]">{stats?.activeCount || 0}</div>
              <div className="text-xs text-gray-400">Active Members</div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 bg-[#252525] border-white/10 text-white"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {(membershipTypeFilter !== 'all' || statusFilter !== 'all') && (
                  <Badge className="ml-2 h-4 bg-[#00A36C] border-0">•</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="bg-[#1C1C1C] border-white/10 max-h-[80vh]"
            >
              <SheetHeader>
                <SheetTitle className="text-white">Filter Members</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Membership Type</Label>
                  <Select value={membershipTypeFilter} onValueChange={setMembershipTypeFilter}>
                    <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252525] border-white/10">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Trustee">Trustee</SelectItem>
                      <SelectItem value="Tapasvi">Tapasvi</SelectItem>
                      <SelectItem value="Karyakarta">Karyakarta</SelectItem>
                      <SelectItem value="Labharti">Labharti</SelectItem>
                      <SelectItem value="Extra">Extra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252525] border-white/10">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-[#252525] border-white/10 text-white"
                    onClick={() => {
                      setMembershipTypeFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button
                    className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
                    onClick={() => setIsFilterSheetOpen(false)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="outline"
            onClick={exportMembers}
            className="bg-[#252525] border-white/10 text-white"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-[#00A36C] hover:bg-[#00A36C]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Members List */}
        <div className="space-y-3">
          <div className="text-sm text-gray-400">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </div>

          {members.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-12 text-center">
                <div className="text-gray-400">No members found</div>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {members.map((member: any, index: number) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00A36C] to-[#B8860B] flex items-center justify-center text-white font-bold flex-shrink-0">
                          {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <h3 className="font-semibold text-white text-sm">
                                {member.full_name}
                              </h3>
                              <p className="text-xs text-gray-400 font-mono">{member.id}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {getMembershipBadge(member.membership_type)}
                              {getStatusBadge(member.status)}
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-gray-400">
                            {member.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{member.email}</span>
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                            {member.city && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" />
                                <span>{member.city}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="h-3 w-3" />
                              <span>
                                Joined {format(new Date(member.created_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(member)}
                              className="flex-1 h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteMember(member.id, member.full_name)}
                              className="h-8 bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Create Member Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Member</DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill in the member details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Membership Type</Label>
              <Select
                value={formData.membership_type}
                onValueChange={(value) => setFormData({ ...formData, membership_type: value })}
              >
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  <SelectItem value="Trustee">Trustee</SelectItem>
                  <SelectItem value="Tapasvi">Tapasvi</SelectItem>
                  <SelectItem value="Karyakarta">Karyakarta</SelectItem>
                  <SelectItem value="Labharti">Labharti</SelectItem>
                  <SelectItem value="Extra">Extra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Date of Birth *</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-[#252525] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="bg-[#252525] border-white/10 text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMemberMutation.mutate(formData)}
              disabled={createMemberMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {createMemberMutation.isPending ? 'Creating...' : 'Create Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Member</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update member details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-[#252525] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="bg-[#252525] border-white/10 text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedMember &&
                editMemberMutation.mutate({ id: selectedMember.id, data: formData })
              }
              disabled={editMemberMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {editMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default MobileMemberManagement;
