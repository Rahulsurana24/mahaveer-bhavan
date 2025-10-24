import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  QrCode,
  CheckCircle,
  Users,
  Search,
  Camera,
  X,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import QrScanner from 'react-qr-scanner';

const MobileAttendanceManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedItem, setSelectedItem] = useState<string>('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [scannedMember, setScannedMember] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch attendance items (events/trips)
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['attendance-items'],
    queryFn: async () => {
      // Get today's and upcoming events
      const today = new Date().toISOString().split('T')[0];

      const { data: events } = await supabase
        .from('events')
        .select('id, title, date, location')
        .eq('is_published', true)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(10);

      // Get active trips
      const { data: trips } = await supabase
        .from('trips')
        .select('id, title, start_date, destination')
        .eq('is_published', true)
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(10);

      const combined = [
        ...(events || []).map(e => ({
          id: `event-${e.id}`,
          actualId: e.id,
          type: 'event',
          title: e.title,
          date: e.date,
          location: e.location
        })),
        ...(trips || []).map(t => ({
          id: `trip-${t.id}`,
          actualId: t.id,
          type: 'trip',
          title: t.title,
          date: t.start_date,
          location: t.destination
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return combined;
    }
  });

  // Fetch today's attendance for selected item
  const { data: todayRecords } = useQuery({
    queryKey: ['attendance-today', selectedItem],
    queryFn: async () => {
      if (!selectedItem) return [];

      const [type, id] = selectedItem.split('-');
      const today = new Date().toISOString().split('T')[0];

      const tableName = type === 'event' ? 'event_registrations' : 'trip_registrations';

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          members (id, full_name, membership_type, phone, avatar_url)
        `)
        .eq(type === 'event' ? 'event_id' : 'trip_id', id)
        .eq('attendance_marked', true)
        .gte('attendance_marked_at', `${today}T00:00:00`);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedItem
  });

  // Fetch all registered members for selected item
  const { data: registeredMembers } = useQuery({
    queryKey: ['registered-members', selectedItem, searchTerm],
    queryFn: async () => {
      if (!selectedItem) return [];

      const [type, id] = selectedItem.split('-');
      const tableName = type === 'event' ? 'event_registrations' : 'trip_registrations';

      let query = supabase
        .from(tableName)
        .select(`
          *,
          members (id, full_name, membership_type, phone, avatar_url)
        `)
        .eq(type === 'event' ? 'event_id' : 'trip_id', id);

      if (searchTerm) {
        // Note: This is a simplified search, may need adjustment based on your schema
        query = query.filter('members.full_name', 'ilike', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedItem
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ memberId, method }: { memberId: string; method: 'qr_scan' | 'manual' }) => {
      if (!selectedItem) throw new Error('No item selected');

      const [type, id] = selectedItem.split('-');
      const tableName = type === 'event' ? 'event_registrations' : 'trip_registrations';
      const idField = type === 'event' ? 'event_id' : 'trip_id';

      // Find the registration
      const { data: registration } = await supabase
        .from(tableName)
        .select('id')
        .eq(idField, id)
        .eq('member_id', memberId)
        .single();

      if (!registration) {
        throw new Error('Member not registered for this event/trip');
      }

      // Mark attendance
      const { error } = await supabase
        .from(tableName)
        .update({
          attendance_marked: true,
          attendance_marked_at: new Date().toISOString(),
          attendance_method: method,
          attendance_notes: notes || null
        })
        .eq('id', registration.id);

      if (error) throw error;

      return { memberId, method };
    },
    onSuccess: ({ memberId, method }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['registered-members'] });

      toast({
        title: "✓ Attendance Marked",
        description: `Successfully marked via ${method === 'qr_scan' ? 'QR scan' : 'manual entry'}`,
      });

      setScannerOpen(false);
      setScannedMember(null);
      setShowConfirmDialog(false);
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive"
      });
    }
  });

  const handleQRScan = async (data: any) => {
    if (data?.text) {
      // Extract member ID from QR code (format: MAHAVEER_MEMBER:member_id)
      const match = data.text.match(/MAHAVEER_MEMBER:(.+)/);
      const memberId = match ? match[1] : data.text;

      if (!selectedItem) {
        toast({
          title: "Select Event/Trip First",
          description: "Please select an event or trip before scanning",
          variant: "destructive"
        });
        return;
      }

      // Fetch member details
      const { data: member, error } = await supabase
        .from('members')
        .select('id, full_name, membership_type, phone, avatar_url, status')
        .eq('id', memberId)
        .single();

      if (error || !member) {
        toast({
          title: "⚠️ Member Not Found",
          description: "Invalid or expired member ID",
          variant: "destructive"
        });
        return;
      }

      if (member.status !== 'active') {
        toast({
          title: "⚠️ Member Not Active",
          description: `Member status: ${member.status}`,
          variant: "destructive"
        });
        return;
      }

      // Check if registered
      const [type, id] = selectedItem.split('-');
      const tableName = type === 'event' ? 'event_registrations' : 'trip_registrations';
      const idField = type === 'event' ? 'event_id' : 'trip_id';

      const { data: registration } = await supabase
        .from(tableName)
        .select('attendance_marked')
        .eq(idField, id)
        .eq('member_id', memberId)
        .single();

      if (!registration) {
        toast({
          title: "⚠️ Not Registered",
          description: "Member is not registered for this event/trip",
          variant: "destructive"
        });
        return;
      }

      if (registration.attendance_marked) {
        toast({
          title: "Already Marked",
          description: "Attendance already marked for this member",
          variant: "destructive"
        });
        return;
      }

      // Show confirmation dialog
      setScannedMember(member);
      setShowConfirmDialog(true);
      setScannerOpen(false);
    }
  };

  const confirmMarkAttendance = () => {
    if (scannedMember) {
      markAttendanceMutation.mutate({
        memberId: scannedMember.id,
        method: 'qr_scan'
      });
    }
  };

  const handleManualMark = (memberId: string) => {
    markAttendanceMutation.mutate({
      memberId,
      method: 'manual'
    });
  };

  const selectedItemData = items?.find(i => i.id === selectedItem);

  if (itemsLoading) {
    return (
      <MobileLayout title="Attendance">
        <div className="flex justify-center items-center min-h-screen bg-[#1C1C1C]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Attendance Management">
      <div className="min-h-screen bg-[#1C1C1C]">
        {/* Event Selector */}
        <div className="sticky top-14 z-30 bg-gradient-to-b from-[#252525] to-[#1C1C1C] border-b border-white/10 px-4 py-4">
          <Label className="text-gray-300 text-sm mb-2 block">Select Event/Trip</Label>
          <Select value={selectedItem} onValueChange={setSelectedItem}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Choose event or trip" />
            </SelectTrigger>
            <SelectContent className="bg-[#252525] border-white/10">
              {items?.map((item) => (
                <SelectItem key={item.id} value={item.id} className="text-white">
                  <div className="flex items-center gap-2">
                    {item.type === 'event' ? (
                      <Calendar className="h-4 w-4 text-[#00A36C]" />
                    ) : (
                      <Users className="h-4 w-4 text-[#B8860B]" />
                    )}
                    <span>{item.title}</span>
                    <Badge className="ml-2 text-xs" variant="outline">
                      {format(new Date(item.date), 'MMM d')}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedItemData && (
            <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Calendar className="h-4 w-4 text-[#B8860B]" />
                <span>{format(new Date(selectedItemData.date), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300 mt-1">
                <Users className="h-4 w-4 text-[#B8860B]" />
                <span>{selectedItemData.location}</span>
              </div>
            </div>
          )}
        </div>

        {!selectedItem ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <QrCode className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Select Event/Trip</h3>
            <p className="text-gray-400 text-sm text-center">
              Choose an event or trip from the dropdown above to start marking attendance
            </p>
          </div>
        ) : (
          <div className="space-y-6 px-4 py-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-white mb-1">
                    {todayRecords?.length || 0}
                  </div>
                  <p className="text-xs text-gray-400">Marked Today</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-white mb-1">
                    {registeredMembers?.length || 0}
                  </div>
                  <p className="text-xs text-gray-400">Total Registered</p>
                </CardContent>
              </Card>
            </div>

            {/* QR Scanner Button */}
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setScannerOpen(!scannerOpen)}
                className="w-full h-16 bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] text-white text-lg font-semibold"
              >
                {scannerOpen ? (
                  <>
                    <X className="h-6 w-6 mr-2" />
                    Stop Scanner
                  </>
                ) : (
                  <>
                    <Camera className="h-6 w-6 mr-2" />
                    Scan QR Code
                  </>
                )}
              </Button>
            </motion.div>

            {/* QR Scanner */}
            <AnimatePresence>
              {scannerOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative aspect-square bg-black">
                        <QrScanner
                          delay={300}
                          onError={(error) => console.error('QR Scanner error:', error)}
                          onScan={handleQRScan}
                          style={{ width: '100%', height: '100%' }}
                          constraints={{
                            video: { facingMode: 'environment' }
                          }}
                        />
                        <div className="absolute inset-0 border-4 border-[#00A36C] m-8 rounded-lg pointer-events-none" />
                      </div>
                      <div className="p-4 bg-[#00A36C]/10 border-t border-[#00A36C]/20">
                        <p className="text-sm text-center text-gray-300">
                          Position member's ID card QR code within the frame
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Manual Marking Section */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#B8860B]" />
                Manual Marking
              </h3>

              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-xs">Optional Notes</Label>
                    <Textarea
                      placeholder="Add notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
                    />
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {registeredMembers && registeredMembers.length > 0 ? (
                      registeredMembers.map((reg: any) => {
                        const member = reg.members;
                        const isMarked = todayRecords?.some((r: any) => r.member_id === member.id);

                        return (
                          <Card
                            key={reg.id}
                            className="bg-white/5 border-white/10 overflow-hidden"
                          >
                            <CardContent className="p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00A36C] to-[#008556] flex items-center justify-center text-white font-semibold flex-shrink-0">
                                  {member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium text-sm truncate">
                                    {member.full_name}
                                  </p>
                                  <Badge className="bg-[#B8860B]/20 text-[#B8860B] border-[#B8860B]/30 text-xs mt-1">
                                    {member.membership_type}
                                  </Badge>
                                </div>
                              </div>

                              {isMarked ? (
                                <Badge className="bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/30 flex-shrink-0">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Marked
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleManualMark(member.id)}
                                  disabled={markAttendanceMutation.isPending}
                                  className="bg-gradient-to-r from-[#B8860B] to-[#9a7209] hover:from-[#9a7209] hover:to-[#B8860B] flex-shrink-0"
                                >
                                  Mark
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No registered members found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Records */}
            {todayRecords && todayRecords.length > 0 && (
              <div>
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#00A36C]" />
                  Marked Today ({todayRecords.length})
                </h3>

                <div className="space-y-2">
                  {todayRecords.map((record: any) => (
                    <Card
                      key={record.id}
                      className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10"
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00A36C] to-[#008556] flex items-center justify-center text-white font-semibold">
                            {record.members?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {record.members?.full_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-400">
                                {format(new Date(record.attendance_marked_at), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Badge
                          className={cn(
                            "text-xs",
                            record.attendance_method === 'qr_scan'
                              ? "bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/30"
                              : "bg-[#B8860B]/20 text-[#B8860B] border-[#B8860B]/30"
                          )}
                        >
                          {record.attendance_method === 'qr_scan' ? 'QR' : 'Manual'}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-[#252525] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Confirm Attendance</DialogTitle>
              <DialogDescription className="text-gray-400">
                Verify member details before marking attendance
              </DialogDescription>
            </DialogHeader>

            {scannedMember && (
              <div className="space-y-4">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#00A36C] to-[#008556] flex items-center justify-center text-white text-2xl font-bold">
                        {scannedMember.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{scannedMember.full_name}</h3>
                        <Badge className="bg-[#B8860B]/20 text-[#B8860B] border-[#B8860B]/30 mt-1">
                          {scannedMember.membership_type}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <UserCheck className="h-4 w-4 text-[#00A36C]" />
                        <span>Status: {scannedMember.status}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Users className="h-4 w-4 text-[#00A36C]" />
                        <span>Phone: {scannedMember.phone}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setScannedMember(null);
                    }}
                    className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmMarkAttendance}
                    disabled={markAttendanceMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C]"
                  >
                    {markAttendanceMutation.isPending ? (
                      <>
                        <Loading size="sm" />
                        <span className="ml-2">Marking...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default MobileAttendanceManagement;
