import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  CameraOff,
  Search,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  UserCheck,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';
import { Html5Qrcode } from 'html5-qrcode';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  start_date: string;
  type: 'event' | 'trip';
}

interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  photo_url: string;
  membership_type: string;
  check_in_time?: string;
  is_present: boolean;
}

interface AttendanceRecord {
  member_id: string;
  check_in_time: string;
}

const AttendanceTracking = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scanner');
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // QR Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ name: string; time: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Manual entry state
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadMembersAndAttendance();
    }
  }, [selectedEvent]);

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);

      // Load recent events and trips
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_date')
        .gte('start_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_date', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('id, title, start_date')
        .gte('start_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_date', { ascending: false })
        .limit(20);

      if (tripsError) throw tripsError;

      // Combine and format
      const allEvents: Event[] = [
        ...(eventsData || []).map(e => ({ ...e, type: 'event' as const })),
        ...(tripsData || []).map(t => ({ ...t, type: 'trip' as const }))
      ].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

      setEvents(allEvents);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events and trips',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMembersAndAttendance = async () => {
    if (!selectedEvent) return;

    try {
      setLoading(true);

      if (selectedEvent.type === 'event') {
        // Load event registrations
        const { data: registrations, error: regError } = await supabase
          .from('event_registrations')
          .select(`
            member_id,
            members (
              id,
              full_name,
              email,
              phone,
              photo_url,
              membership_type
            )
          `)
          .eq('event_id', selectedEvent.id)
          .eq('registration_status', 'confirmed');

        if (regError) throw regError;

        // For events, check if we need to add check_in_time to event_registrations
        // For now, we'll use trip_attendance table for all attendance
        const { data: attendanceData, error: attError } = await supabase
          .from('trip_attendance')
          .select('member_id, check_in_time')
          .eq('trip_id', selectedEvent.id);

        const attendanceMap = new Map(
          attendanceData?.map(a => [a.member_id, a.check_in_time]) || []
        );

        const membersList = registrations?.map((reg: any) => ({
          ...reg.members,
          check_in_time: attendanceMap.get(reg.member_id),
          is_present: attendanceMap.has(reg.member_id)
        })) || [];

        setMembers(membersList);
        setAttendance(attendanceData || []);
      } else {
        // Load trip registrations
        const { data: registrations, error: regError } = await supabase
          .from('trip_registrations')
          .select(`
            member_id,
            members (
              id,
              full_name,
              email,
              phone,
              photo_url,
              membership_type
            )
          `)
          .eq('trip_id', selectedEvent.id)
          .eq('registration_status', 'confirmed');

        if (regError) throw regError;

        const { data: attendanceData, error: attError } = await supabase
          .from('trip_attendance')
          .select('member_id, check_in_time')
          .eq('trip_id', selectedEvent.id);

        if (attError) throw attError;

        const attendanceMap = new Map(
          attendanceData?.map(a => [a.member_id, a.check_in_time]) || []
        );

        const membersList = registrations?.map((reg: any) => ({
          ...reg.members,
          check_in_time: attendanceMap.get(reg.member_id),
          is_present: attendanceMap.has(reg.member_id)
        })) || [];

        setMembers(membersList);
        setAttendance(attendanceData || []);
      }
    } catch (error: any) {
      console.error('Error loading members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registrations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (memberId: string) => {
    if (!selectedEvent) return;

    try {
      // Check if member is registered
      const isRegistered = members.some(m => m.id === memberId);
      if (!isRegistered) {
        toast({
          title: 'Not Registered',
          description: 'This member is not registered for this event/trip',
          variant: 'destructive'
        });
        return;
      }

      // Check if already marked present
      if (attendance.some(a => a.member_id === memberId)) {
        toast({
          title: 'Already Present',
          description: 'This member has already been marked present',
          variant: 'destructive'
        });
        return;
      }

      // Mark attendance
      const { error } = await supabase
        .from('trip_attendance')
        .insert({
          trip_id: selectedEvent.id,
          member_id: memberId,
          check_in_time: new Date().toISOString(),
          attended: true
        });

      if (error) throw error;

      // Find member name for feedback
      const member = members.find(m => m.id === memberId);

      setLastScanned({
        name: member?.full_name || memberId,
        time: new Date().toLocaleTimeString()
      });

      // Play success sound
      const audio = new Audio('data:audio/wav;base64,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');
      audio.play().catch(() => {}); // Ignore audio errors

      toast({
        title: 'Attendance Marked',
        description: `${member?.full_name} marked present`,
      });

      // Reload data
      await loadMembersAndAttendance();
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark attendance',
        variant: 'destructive'
      });
    }
  };

  const removeAttendance = async (memberId: string) => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('trip_attendance')
        .delete()
        .eq('trip_id', selectedEvent.id)
        .eq('member_id', memberId);

      if (error) throw error;

      toast({
        title: 'Attendance Removed',
        description: 'Member marked as absent',
      });

      await loadMembersAndAttendance();
    } catch (error: any) {
      console.error('Error removing attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove attendance',
        variant: 'destructive'
      });
    }
  };

  const startScanning = async () => {
    try {
      setScannerError(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          try {
            // Parse QR code data
            const data = JSON.parse(decodedText);

            if (data.type === 'mahaveer_member' && data.member_id) {
              await markAttendance(data.member_id);
            } else {
              toast({
                title: 'Invalid QR Code',
                description: 'This is not a valid member QR code',
                variant: 'destructive'
              });
            }
          } catch (e) {
            // If not JSON, try as direct member ID
            if (decodedText.match(/^[A-Z]{2}\d+$/)) {
              await markAttendance(decodedText);
            } else {
              toast({
                title: 'Invalid QR Code',
                description: 'Could not parse QR code data',
                variant: 'destructive'
              });
            }
          }
        },
        (errorMessage) => {
          // Ignore scan errors (happens frequently)
        }
      );

      setIsScanning(true);
    } catch (error: any) {
      console.error('Error starting scanner:', error);
      setScannerError('Failed to access camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setIsScanning(false);
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  };

  const handleManualSearch = async (query: string) => {
    setManualSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Filter from current members list
    const results = members.filter(m =>
      m.full_name.toLowerCase().includes(query.toLowerCase()) ||
      m.id.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);

    setSearchResults(results);
  };

  const handleManualMarkPresent = async () => {
    if (!selectedMember) return;

    await markAttendance(selectedMember.id);
    setSelectedMember(null);
    setManualSearchQuery('');
    setSearchResults([]);
  };

  const exportToCSV = () => {
    if (!selectedEvent) return;

    const headers = ['Name', 'Member ID', 'Email', 'Phone', 'Status', 'Check-in Time'];
    const rows = filteredMembers.map(member => [
      member.full_name,
      member.id,
      member.email,
      member.phone,
      member.is_present ? 'Present' : 'Absent',
      member.check_in_time ? format(new Date(member.check_in_time), 'yyyy-MM-dd HH:mm:ss') : ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedEvent.title}-attendance.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Attendance exported to CSV',
    });
  };

  const filteredMembers = members.filter(member => {
    // Filter by status
    if (filter === 'present' && !member.is_present) return false;
    if (filter === 'absent' && member.is_present) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        member.full_name.toLowerCase().includes(query) ||
        member.id.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const presentCount = members.filter(m => m.is_present).length;
  const totalCount = members.length;
  const attendancePercentage = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

  if (loading && !selectedEvent) {
    return (
      <AdminLayout title="Attendance Tracking">
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Attendance Tracking">
      <div className="space-y-6">
        {/* Event Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Event or Trip</CardTitle>
            <CardDescription>Choose an event or trip to track attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEvent?.id || ''}
              onValueChange={(value) => {
                const event = events.find(e => e.id === value);
                setSelectedEvent(event || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event or trip" />
              </SelectTrigger>
              <SelectContent>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.type === 'event' ? 'default' : 'secondary'}>
                        {event.type}
                      </Badge>
                      {event.title} - {format(new Date(event.start_date), 'MMM dd, yyyy')}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEvent && (
          <>
            {/* Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendance Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{presentCount}</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">{totalCount - presentCount}</p>
                      <p className="text-sm text-muted-foreground">Absent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{totalCount}</p>
                      <p className="text-sm text-muted-foreground">Total Registered</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Attendance Rate</span>
                      <span className="font-medium">{attendancePercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={attendancePercentage} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Tabs */}
            <Card>
              <CardContent className="pt-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="scanner">
                      <Camera className="h-4 w-4 mr-2" />
                      QR Scanner
                    </TabsTrigger>
                    <TabsTrigger value="manual">
                      <Search className="h-4 w-4 mr-2" />
                      Manual Entry
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <Users className="h-4 w-4 mr-2" />
                      Attendance List
                    </TabsTrigger>
                  </TabsList>

                  {/* QR Scanner Tab */}
                  <TabsContent value="scanner" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div
                          id="qr-reader"
                          className={`w-full max-w-md ${isScanning ? '' : 'hidden'}`}
                          style={{ border: '2px solid #4ade80', borderRadius: '8px' }}
                        />
                        {!isScanning && (
                          <div className="w-full max-w-md h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <Camera className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                              <p className="text-muted-foreground">Camera preview will appear here</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {scannerError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{scannerError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex justify-center gap-2">
                        {!isScanning ? (
                          <Button onClick={startScanning} size="lg">
                            <Camera className="h-4 w-4 mr-2" />
                            Start Scanning
                          </Button>
                        ) : (
                          <Button onClick={stopScanning} size="lg" variant="destructive">
                            <CameraOff className="h-4 w-4 mr-2" />
                            Stop Scanning
                          </Button>
                        )}
                      </div>

                      {lastScanned && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Last Scanned:</strong> {lastScanned.name} at {lastScanned.time}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>

                  {/* Manual Entry Tab */}
                  <TabsContent value="manual" className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Search Member</Label>
                        <Input
                          placeholder="Enter member ID or search by name..."
                          value={manualSearchQuery}
                          onChange={(e) => handleManualSearch(e.target.value)}
                          autoFocus
                        />
                      </div>

                      {searchResults.length > 0 && (
                        <Card>
                          <CardContent className="p-0">
                            {searchResults.map(member => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted cursor-pointer"
                                onClick={() => setSelectedMember(member)}
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={member.photo_url || '/default-avatar.png'}
                                    alt={member.full_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                  <div>
                                    <p className="font-medium">{member.full_name}</p>
                                    <p className="text-sm text-muted-foreground">{member.id}</p>
                                  </div>
                                </div>
                                {member.is_present ? (
                                  <Badge variant="default">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Present
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Absent</Badge>
                                )}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {selectedMember && (
                        <Alert>
                          <AlertDescription>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img
                                  src={selectedMember.photo_url || '/default-avatar.png'}
                                  alt={selectedMember.full_name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                                <div>
                                  <p className="font-medium">{selectedMember.full_name}</p>
                                  <p className="text-sm text-muted-foreground">{selectedMember.id}</p>
                                </div>
                              </div>
                              <Button
                                onClick={handleManualMarkPresent}
                                disabled={selectedMember.is_present}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                {selectedMember.is_present ? 'Already Present' : 'Mark Present'}
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>

                  {/* Attendance List Tab */}
                  <TabsContent value="list" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Members</SelectItem>
                            <SelectItem value="present">Present Only</SelectItem>
                            <SelectItem value="absent">Absent Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Search members..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-64"
                        />
                      </div>
                      <Button onClick={exportToCSV} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>

                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loading size="lg" />
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No members found. Adjust your filters or check registrations.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Member ID</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Check-in Time</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMembers.map(member => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <img
                                    src={member.photo_url || '/default-avatar.png'}
                                    alt={member.full_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                  <div>
                                    <p className="font-medium">{member.full_name}</p>
                                    <p className="text-sm text-muted-foreground">{member.membership_type}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{member.id}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{member.email}</p>
                                  <p className="text-muted-foreground">{member.phone}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {member.is_present ? (
                                  <Badge variant="default">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Present
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Absent
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {member.check_in_time ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    {format(new Date(member.check_in_time), 'HH:mm:ss')}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {member.is_present ? (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeAttendance(member.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => markAttendance(member.id)}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Mark Present
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AttendanceTracking;
