import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QrCode,
  CheckCircle,
  Users,
  Plus,
  Search,
  Camera,
  Edit,
  Trash2,
  Settings
} from 'lucide-react';
import QrScanner from 'react-qr-scanner';
import { format } from 'date-fns';

const AttendanceManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [manualMemberId, setManualMemberId] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check admin role
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('role_id, user_roles(name)')
          .eq('auth_id', user.id)
          .single();

        const role = (data as any)?.user_roles?.name;
        setIsSuperAdmin(role === 'superadmin' || role === 'management_admin');
      }
    };
    checkRole();
  }, []);

  // Fetch attendance items
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['attendance-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Fetch today's attendance records
  const { data: todayRecords } = useQuery({
    queryKey: ['attendance-records-today', selectedItem],
    queryFn: async () => {
      if (!selectedItem) return [];

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          members (id, full_name, membership_type, phone)
        `)
        .eq('item_id', selectedItem)
        .gte('marked_at', `${today}T00:00:00`)
        .lte('marked_at', `${today}T23:59:59`)
        .order('marked_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedItem
  });

  // Fetch all members for manual marking
  const { data: members } = useQuery({
    queryKey: ['members-for-attendance', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('members')
        .select('id, full_name, membership_type, phone, status')
        .eq('status', 'active')
        .order('full_name');

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    }
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async (data: {
      memberId: string;
      itemId: string;
      scanMethod: 'qr_scan' | 'manual';
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('attendance_records')
        .insert({
          member_id: data.memberId,
          item_id: data.itemId,
          marked_by: userData.user?.id,
          scan_method: data.scanMethod,
          notes: data.notes || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records-today'] });
      toast({
        title: 'Success',
        description: 'Attendance marked successfully',
      });
      setManualMemberId('');
      setNotes('');
      setScannerOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message.includes('duplicate')
          ? 'Attendance already marked for this member today'
          : 'Failed to mark attendance',
        variant: 'destructive',
      });
    }
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('attendance_items')
        .insert({
          item_name: data.name,
          description: data.description,
          created_by: userData.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-items'] });
      toast({
        title: 'Success',
        description: 'Attendance item created successfully',
      });
      setIsCreateItemOpen(false);
      setNewItemName('');
      setNewItemDescription('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create attendance item',
        variant: 'destructive',
      });
    }
  });

  const handleQRScan = (data: any) => {
    if (data?.text) {
      const memberId = data.text;

      if (!selectedItem) {
        toast({
          title: 'Error',
          description: 'Please select an attendance item first',
          variant: 'destructive',
        });
        return;
      }

      markAttendanceMutation.mutate({
        memberId,
        itemId: selectedItem,
        scanMethod: 'qr_scan'
      });
    }
  };

  const handleManualMark = (memberId: string) => {
    if (!selectedItem) {
      toast({
        title: 'Error',
        description: 'Please select an attendance item first',
        variant: 'destructive',
      });
      return;
    }

    markAttendanceMutation.mutate({
      memberId,
      itemId: selectedItem,
      scanMethod: 'manual',
      notes
    });
  };

  const handleCreateItem = () => {
    if (!newItemName) {
      toast({
        title: 'Validation Error',
        description: 'Item name is required',
        variant: 'destructive',
      });
      return;
    }

    createItemMutation.mutate({
      name: newItemName,
      description: newItemDescription
    });
  };

  return (
    <AdminLayout title="Attendance Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Attendance Management</h2>
            <p className="text-muted-foreground">Mark attendance for kit distribution and other items</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setIsCreateItemOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>

        {/* Select Item */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Select Attendance Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Choose item to mark attendance" />
              </SelectTrigger>
              <SelectContent>
                {items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedItem && (
          <Tabs defaultValue="manual" className="space-y-6">
            <TabsList>
              <TabsTrigger value="manual">
                <Users className="h-4 w-4 mr-2" />
                Manual Marking
              </TabsTrigger>
              <TabsTrigger value="qr">
                <QrCode className="h-4 w-4 mr-2" />
                QR Scan
              </TabsTrigger>
              <TabsTrigger value="records">
                <CheckCircle className="h-4 w-4 mr-2" />
                Today's Records
              </TabsTrigger>
            </TabsList>

            {/* Manual Marking Tab */}
            <TabsContent value="manual" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mark Attendance Manually</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or member ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Optional Notes</Label>
                    <Textarea
                      placeholder="Add any notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members?.map((member) => {
                          const isMarked = todayRecords?.some(
                            (r) => r.member_id === member.id
                          );

                          return (
                            <TableRow key={member.id}>
                              <TableCell className="font-mono text-sm">
                                {member.id}
                              </TableCell>
                              <TableCell>{member.full_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{member.membership_type}</Badge>
                              </TableCell>
                              <TableCell>
                                {isMarked ? (
                                  <Badge variant="default">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Marked
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleManualMark(member.id)}
                                    disabled={markAttendanceMutation.isPending}
                                  >
                                    Mark Present
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* QR Scan Tab */}
            <TabsContent value="qr" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scan Member ID Card</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => setScannerOpen(!scannerOpen)}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {scannerOpen ? 'Stop Scanner' : 'Start QR Scanner'}
                  </Button>

                  {scannerOpen && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <QrScanner
                        delay={300}
                        onError={(error) => console.error(error)}
                        onScan={handleQRScan}
                        style={{ width: '100%' }}
                        constraints={{
                          video: { facingMode: 'environment' }
                        }}
                      />
                      <p className="text-sm text-center text-muted-foreground mt-4">
                        Position the QR code from member's ID card within the frame
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> Scan the QR code on the member's ID card to automatically mark attendance
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Today's Records Tab */}
            <TabsContent value="records" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Attendance - {format(new Date(), 'MMMM dd, yyyy')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <Card className="flex-1 p-4">
                        <div className="text-2xl font-bold">{todayRecords?.length || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Marked</div>
                      </Card>
                      <Card className="flex-1 p-4">
                        <div className="text-2xl font-bold">
                          {todayRecords?.filter((r) => r.scan_method === 'qr_scan').length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Via QR Scan</div>
                      </Card>
                      <Card className="flex-1 p-4">
                        <div className="text-2xl font-bold">
                          {todayRecords?.filter((r) => r.scan_method === 'manual').length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Manual Entry</div>
                      </Card>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayRecords?.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-mono text-sm">
                              {record.member_id}
                            </TableCell>
                            <TableCell>{record.members?.full_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.members?.membership_type}</Badge>
                            </TableCell>
                            <TableCell>{format(new Date(record.marked_at), 'HH:mm:ss')}</TableCell>
                            <TableCell>
                              <Badge variant={record.scan_method === 'qr_scan' ? 'default' : 'secondary'}>
                                {record.scan_method === 'qr_scan' ? 'QR Scan' : 'Manual'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Create Item Dialog */}
        <Dialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Attendance Item</DialogTitle>
              <DialogDescription>
                Create a new item for attendance tracking (e.g., Kit Distribution, Gift Distribution)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  placeholder="e.g., Monthly Kit Distribution"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateItemOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateItem} disabled={createItemMutation.isPending}>
                {createItemMutation.isPending ? 'Creating...' : 'Create Item'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AttendanceManagement;
