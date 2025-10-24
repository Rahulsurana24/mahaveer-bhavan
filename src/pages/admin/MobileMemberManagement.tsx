import { useEffect, useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Key,
  CreditCard,
  Activity,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
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
  const [dateRangeFilter, setDateRangeFilter] = useState({ from: '', to: '' });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportData, setBulkImportData] = useState<any[]>([]);
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
    queryKey: ['mobile-members', searchTerm, membershipTypeFilter, statusFilter, dateRangeFilter],
    queryFn: async () => {
      let query = supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
      }

      if (membershipTypeFilter !== 'all') {
        query = query.eq('membership_type', membershipTypeFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateRangeFilter.from) {
        query = query.gte('created_at', dateRangeFilter.from);
      }

      if (dateRangeFilter.to) {
        query = query.lte('created_at', dateRangeFilter.to);
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

  // Fetch member activity history
  const { data: memberActivity } = useQuery({
    queryKey: ['member-activity', selectedMember?.id],
    queryFn: async () => {
      if (!selectedMember?.id) return null;

      // Fetch event attendance
      const { data: eventAttendance } = await supabase
        .from('event_attendance')
        .select(`
          *,
          events (title, date, location)
        `)
        .eq('member_id', selectedMember.id)
        .order('events(date)', { ascending: false });

      // Fetch donations
      const { data: donations } = await supabase
        .from('donations')
        .select('*')
        .eq('donor_email', selectedMember.email)
        .order('created_at', { ascending: false });

      // Fetch distribution history
      const { data: distributions } = await supabase
        .from('distribution_records')
        .select(`
          *,
          distribution_lists (list_name, item_types (name))
        `)
        .eq('member_id', selectedMember.id)
        .eq('status', 'distributed')
        .order('distributed_at', { ascending: false });

      return {
        eventAttendance: eventAttendance || [],
        donations: donations || [],
        distributions: distributions || [],
      };
    },
    enabled: !!selectedMember?.id && isDetailDialogOpen,
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

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: '✓ Password Reset Email Sent',
        description: 'Member will receive instructions to reset their password',
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

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (importData: any[]) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const row of importData) {
        try {
          // Validate required fields
          if (!row.full_name || !row.email || !row.phone || !row.membership_type) {
            results.failed++;
            results.errors.push(`Row missing required fields: ${row.full_name || 'Unknown'}`);
            continue;
          }

          // Check if email already exists
          const { data: existingMember } = await supabase
            .from('members')
            .select('id')
            .eq('email', row.email)
            .single();

          if (existingMember) {
            results.failed++;
            results.errors.push(`Email already exists: ${row.email}`);
            continue;
          }

          // Generate member ID
          const memberId = await generateMemberId(row.membership_type);

          // Insert member
          const { error } = await supabase.from('members').insert([
            {
              id: memberId,
              full_name: row.full_name,
              email: row.email,
              phone: row.phone,
              membership_type: row.membership_type,
              status: row.status || 'active',
              date_of_birth: row.date_of_birth || null,
              gender: row.gender || 'male',
              address: row.address || '',
              city: row.city || '',
              state: row.state || '',
              postal_code: row.postal_code || '',
              country: row.country || 'India',
              photo_url: '/placeholder.svg',
              emergency_contact: {},
            },
          ]);

          if (error) {
            results.failed++;
            results.errors.push(`Failed to import ${row.full_name}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Unexpected error for ${row.full_name}: ${err.message}`);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['mobile-members'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-member-stats'] });

      toast({
        title: '✓ Bulk Import Complete',
        description: `Successfully imported ${results.success} members. ${results.failed} failed.`,
      });

      if (results.errors.length > 0) {
        console.error('Import errors:', results.errors);
      }

      setIsBulkImportDialogOpen(false);
      setBulkImportFile(null);
      setBulkImportData([]);
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

  const handlePasswordReset = (email: string, memberName: string) => {
    if (confirm(`Send password reset email to ${memberName}?`)) {
      passwordResetMutation.mutate(email);
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

  const openDetailDialog = (member: any) => {
    setSelectedMember(member);
    setIsDetailDialogOpen(true);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast({
          title: 'Error',
          description: 'CSV file must contain header row and at least one data row',
          variant: 'destructive',
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const row: any = {};
        headers.forEach((header, index) => {
          row[header.replace(/\s+/g, '_')] = values[index]?.trim() || '';
        });
        return row;
      });

      setBulkImportData(data);
      toast({
        title: '✓ File Parsed',
        description: `Ready to import ${data.length} members`,
      });
    };

    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = [
      ['full_name', 'email', 'phone', 'membership_type', 'status', 'date_of_birth', 'gender', 'address', 'city', 'state'],
      ['John Doe', 'john@example.com', '+919876543210', 'Karyakarta', 'active', '1990-01-01', 'male', '123 Main St', 'Bangalore', 'Karnataka'],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_import_template.csv';
    a.click();
  };

  const downloadMemberIdCard = (member: any) => {
    // Create a simple ID card HTML
    const cardHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .id-card {
            width: 350px;
            height: 220px;
            border: 2px solid #00A36C;
            border-radius: 10px;
            padding: 20px;
            background: linear-gradient(135deg, #1C1C1C 0%, #2A2A2A 100%);
            color: white;
          }
          .header { text-align: center; margin-bottom: 15px; }
          .header h2 { margin: 0; color: #00A36C; font-size: 18px; }
          .content { display: flex; gap: 15px; }
          .photo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00A36C, #B8860B);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: bold;
          }
          .info { flex: 1; }
          .info div { margin: 5px 0; font-size: 12px; }
          .name { font-size: 16px; font-weight: bold; color: #00A36C; }
          .id { font-size: 14px; color: #B8860B; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="id-card">
          <div class="header">
            <h2>MAHAVEER BHAVAN</h2>
            <div style="font-size: 10px; color: #999;">Digital Member ID Card</div>
          </div>
          <div class="content">
            <div class="photo">${member.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
            <div class="info">
              <div class="name">${member.full_name}</div>
              <div class="id">ID: ${member.id}</div>
              <div>${member.membership_type}</div>
              <div>${member.email}</div>
              <div>${member.phone}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([cardHtml], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ID_Card_${member.id}.html`;
    a.click();

    toast({
      title: '✓ ID Card Downloaded',
      description: 'Open the HTML file in a browser to view or print',
    });
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
            placeholder="Search by name, email, phone, or ID..."
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
                {(membershipTypeFilter !== 'all' || statusFilter !== 'all' || dateRangeFilter.from || dateRangeFilter.to) && (
                  <Badge className="ml-2 h-4 bg-[#00A36C] border-0">•</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="bg-[#1C1C1C] border-white/10 max-h-[80vh] overflow-y-auto"
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
                <div className="space-y-2">
                  <Label className="text-gray-300">Registration Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={dateRangeFilter.from}
                      onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, from: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white"
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={dateRangeFilter.to}
                      onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, to: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white"
                      placeholder="To"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-[#252525] border-white/10 text-white"
                    onClick={() => {
                      setMembershipTypeFilter('all');
                      setStatusFilter('all');
                      setDateRangeFilter({ from: '', to: '' });
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
            variant="outline"
            onClick={() => setIsBulkImportDialogOpen(true)}
            className="bg-[#252525] border-white/10 text-white"
          >
            <Upload className="h-4 w-4" />
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
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailDialog(member)}
                              className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(member)}
                              className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
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

      {/* Member Detail Dialog with Tabs */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Member Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedMember?.full_name} - {selectedMember?.id}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#252525]">
              <TabsTrigger value="profile" className="text-white data-[state=active]:bg-[#00A36C]">
                Profile
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-white data-[state=active]:bg-[#00A36C]">
                Activity
              </TabsTrigger>
              <TabsTrigger value="id-card" className="text-white data-[state=active]:bg-[#00A36C]">
                ID Card
              </TabsTrigger>
            </TabsList>

            <div className="max-h-[60vh] overflow-y-auto mt-4">
              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-4">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#00A36C] to-[#B8860B] flex items-center justify-center text-white font-bold text-4xl mb-4">
                    {selectedMember?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <h3 className="text-xl font-bold text-white">{selectedMember?.full_name}</h3>
                  <p className="text-gray-400 font-mono">{selectedMember?.id}</p>
                  <div className="flex gap-2 justify-center mt-2">
                    {selectedMember && getMembershipBadge(selectedMember.membership_type)}
                    {selectedMember && getStatusBadge(selectedMember.status)}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-[#252525] p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Email</div>
                    <div className="text-white flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selectedMember?.email}
                    </div>
                  </div>
                  <div className="bg-[#252525] p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Phone</div>
                    <div className="text-white flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedMember?.phone}
                    </div>
                  </div>
                  <div className="bg-[#252525] p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Address</div>
                    <div className="text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedMember?.address}, {selectedMember?.city}, {selectedMember?.state}
                    </div>
                  </div>
                  <div className="bg-[#252525] p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Date of Birth</div>
                    <div className="text-white">
                      {selectedMember?.date_of_birth
                        ? format(new Date(selectedMember.date_of_birth), 'MMMM dd, yyyy')
                        : 'Not specified'}
                    </div>
                  </div>
                  <div className="bg-[#252525] p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Member Since</div>
                    <div className="text-white">
                      {selectedMember?.created_at && format(new Date(selectedMember.created_at), 'MMMM dd, yyyy')}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-[#252525] border-white/10 text-white"
                    onClick={() => selectedMember && handlePasswordReset(selectedMember.email, selectedMember.full_name)}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                  <Button
                    className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      openEditDialog(selectedMember);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </TabsContent>

              {/* Activity History Tab */}
              <TabsContent value="activity" className="space-y-4">
                {memberActivity ? (
                  <>
                    {/* Event Attendance */}
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#00A36C]" />
                        Event Attendance ({memberActivity.eventAttendance.length})
                      </h4>
                      {memberActivity.eventAttendance.length === 0 ? (
                        <div className="bg-[#252525] p-4 rounded-lg text-center text-gray-400 text-sm">
                          No event attendance recorded
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {memberActivity.eventAttendance.slice(0, 5).map((attendance: any) => (
                            <div key={attendance.id} className="bg-[#252525] p-3 rounded-lg">
                              <div className="text-white font-medium">{attendance.events?.title}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {attendance.events?.date && format(new Date(attendance.events.date), 'MMM dd, yyyy')} · {attendance.events?.location}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Donations */}
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#B8860B]" />
                        Donations ({memberActivity.donations.length})
                      </h4>
                      {memberActivity.donations.length === 0 ? (
                        <div className="bg-[#252525] p-4 rounded-lg text-center text-gray-400 text-sm">
                          No donations recorded
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {memberActivity.donations.slice(0, 5).map((donation: any) => (
                            <div key={donation.id} className="bg-[#252525] p-3 rounded-lg flex justify-between items-center">
                              <div>
                                <div className="text-white font-medium">₹{donation.amount.toLocaleString()}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {format(new Date(donation.created_at), 'MMM dd, yyyy')}
                                </div>
                              </div>
                              <Badge className={donation.status === 'completed' ? 'bg-[#00A36C]' : 'bg-gray-500'}>
                                {donation.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Distribution History */}
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        Items Collected ({memberActivity.distributions.length})
                      </h4>
                      {memberActivity.distributions.length === 0 ? (
                        <div className="bg-[#252525] p-4 rounded-lg text-center text-gray-400 text-sm">
                          No items collected
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {memberActivity.distributions.slice(0, 5).map((dist: any) => (
                            <div key={dist.id} className="bg-[#252525] p-3 rounded-lg">
                              <div className="text-white font-medium">{dist.distribution_lists?.item_types?.name}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {dist.distribution_lists?.list_name} · {dist.distributed_at && format(new Date(dist.distributed_at), 'MMM dd, yyyy h:mm a')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center items-center py-12">
                    <Loading />
                  </div>
                )}
              </TabsContent>

              {/* ID Card Tab */}
              <TabsContent value="id-card" className="space-y-4">
                <div className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-2 border-[#00A36C] rounded-lg p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-[#00A36C] font-bold text-lg">MAHAVEER BHAVAN</h3>
                    <p className="text-xs text-gray-400">Digital Member ID Card</p>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00A36C] to-[#B8860B] flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
                      {selectedMember?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg">{selectedMember?.full_name}</div>
                      <div className="text-[#B8860B] font-mono text-sm">{selectedMember?.id}</div>
                      <div className="text-gray-400 text-sm mt-1">{selectedMember?.membership_type}</div>
                      <div className="text-gray-400 text-xs mt-1">{selectedMember?.email}</div>
                      <div className="text-gray-400 text-xs">{selectedMember?.phone}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#252525] p-4 rounded-lg">
                  <div className="flex items-start gap-2 text-sm text-gray-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>
                      This digital ID card can be downloaded as an HTML file.
                      Open it in a browser to view or print a physical copy for the member.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-[#252525] border-white/10 text-white"
                    onClick={() => selectedMember && downloadMemberIdCard(selectedMember)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download ID Card
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-[#252525] border-white/10 text-white"
                    onClick={() => {
                      // Generate QR code would go here
                      toast({
                        title: 'QR Code',
                        description: 'QR code generation feature coming soon',
                      });
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    View QR Code
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Bulk Import Members</DialogTitle>
            <DialogDescription className="text-gray-400">
              Import multiple members from a CSV file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">CSV Format Requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Required columns: full_name, email, phone, membership_type</li>
                    <li>Optional columns: status, date_of_birth, gender, address, city, state</li>
                    <li>Membership types: Trustee, Tapasvi, Karyakarta, Labharti, Extra</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Upload CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="bg-[#252525] border-white/10 text-white"
              />
              {bulkImportFile && (
                <div className="text-sm text-gray-400 mt-2">
                  File: {bulkImportFile.name} ({bulkImportData.length} rows)
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full bg-[#252525] border-white/10 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>

            {bulkImportData.length > 0 && (
              <div className="bg-[#252525] p-4 rounded-lg max-h-[200px] overflow-y-auto">
                <div className="text-sm text-white font-semibold mb-2">Preview (first 3 rows):</div>
                <div className="space-y-2">
                  {bulkImportData.slice(0, 3).map((row, index) => (
                    <div key={index} className="text-xs text-gray-400 border-b border-white/10 pb-2">
                      <div>{row.full_name} - {row.email}</div>
                      <div>{row.phone} - {row.membership_type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkImportDialogOpen(false);
                setBulkImportFile(null);
                setBulkImportData([]);
              }}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => bulkImportMutation.mutate(bulkImportData)}
              disabled={bulkImportMutation.isPending || bulkImportData.length === 0}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {bulkImportMutation.isPending ? 'Importing...' : `Import ${bulkImportData.length} Members`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
