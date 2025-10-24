import { useState } from 'react';
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
  Plus,
  Download,
  Upload,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Home,
  Bus,
  Train,
  Plane,
  Users,
  MapPin,
  Calendar as CalendarIcon,
  Clock,
  Hash,
  Bed,
  Sparkles,
  AlertCircle,
  CheckCircle,
  FileText,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface LogisticsAssignment {
  id?: string;
  registration_id: string;
  event_trip_id: string;
  member_id: string;
  stage_name: string;
  // Accommodation
  hotel_name: string;
  room_number: string;
  room_type: string;
  sharing_with: string[];
  // Bus
  bus_number: string;
  bus_seat_number: string;
  bus_departure_time: string;
  bus_arrival_time: string;
  // Train
  train_number: string;
  train_name: string;
  train_pnr: string;
  train_coach: string;
  train_seat_berth: string;
  train_departure_time: string;
  train_arrival_time: string;
  // Flight
  flight_number: string;
  flight_pnr: string;
  flight_seat: string;
  flight_departure_time: string;
  flight_arrival_time: string;
  // Meta
  special_instructions: string;
  is_visible_to_member: boolean;
}

const EventLogistics = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewMemberId, setPreviewMemberId] = useState<string>('');
  const [editingLogistics, setEditingLogistics] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState<LogisticsAssignment>({
    registration_id: '',
    event_trip_id: '',
    member_id: '',
    stage_name: '',
    hotel_name: '',
    room_number: '',
    room_type: 'double',
    sharing_with: [],
    bus_number: '',
    bus_seat_number: '',
    bus_departure_time: '',
    bus_arrival_time: '',
    train_number: '',
    train_name: '',
    train_pnr: '',
    train_coach: '',
    train_seat_berth: '',
    train_departure_time: '',
    train_arrival_time: '',
    flight_number: '',
    flight_pnr: '',
    flight_seat: '',
    flight_departure_time: '',
    flight_arrival_time: '',
    special_instructions: '',
    is_visible_to_member: false,
  });

  // Fetch events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events-for-logistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_trips')
        .select('id, activity_name, activity_type, start_date, end_date, duration_days')
        .eq('status', 'published')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch paid registrations for selected event
  const { data: registrations = [] } = useQuery({
    queryKey: ['paid-registrations', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];

      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          member_id,
          members:member_id (
            id,
            full_name,
            email,
            phone,
            membership_type
          ),
          event_payment_tokens (
            token_status,
            verified_at
          )
        `)
        .eq('event_trip_id', selectedEventId)
        .eq('payment_status', 'completed')
        .eq('registration_status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventId,
  });

  // Fetch logistics for selected event and stage
  const { data: logistics = [], isLoading: logisticsLoading } = useQuery({
    queryKey: ['event-logistics', selectedEventId, selectedStage, searchTerm],
    queryFn: async () => {
      if (!selectedEventId) return [];

      let query = supabase
        .from('event_logistics')
        .select(`
          *,
          members:member_id (
            id,
            full_name,
            membership_type
          )
        `)
        .eq('event_trip_id', selectedEventId);

      if (selectedStage) {
        query = query.eq('stage_name', selectedStage);
      }

      if (searchTerm) {
        query = query.or(`member_id.ilike.%${searchTerm}%,members.full_name.ilike.%${searchTerm}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventId,
  });

  // Get other members for sharing selection
  const availableMembers = registrations
    .filter((reg: any) => reg.member_id !== formData.member_id)
    .map((reg: any) => ({
      id: reg.member_id,
      name: reg.members?.full_name || reg.member_id,
    }));

  // Create/Update logistics mutation
  const saveLogisticsMutation = useMutation({
    mutationFn: async (data: LogisticsAssignment) => {
      // Validate required fields
      if (!data.member_id || !data.stage_name) {
        throw new Error('Please select member and stage');
      }

      const selectedReg = registrations.find((r: any) => r.member_id === data.member_id);
      if (!selectedReg) throw new Error('Registration not found');

      const payload = {
        registration_id: selectedReg.id,
        event_trip_id: selectedEventId,
        member_id: data.member_id,
        stage_name: data.stage_name,
        hotel_name: data.hotel_name || null,
        room_number: data.room_number || null,
        room_type: data.room_type || null,
        sharing_with: data.sharing_with.length > 0 ? data.sharing_with : null,
        bus_number: data.bus_number || null,
        bus_seat_number: data.bus_seat_number || null,
        bus_departure_time: data.bus_departure_time || null,
        bus_arrival_time: data.bus_arrival_time || null,
        train_number: data.train_number || null,
        train_name: data.train_name || null,
        train_pnr: data.train_pnr || null,
        train_coach: data.train_coach || null,
        train_seat_berth: data.train_seat_berth || null,
        train_departure_time: data.train_departure_time || null,
        train_arrival_time: data.train_arrival_time || null,
        flight_number: data.flight_number || null,
        flight_pnr: data.flight_pnr || null,
        flight_seat: data.flight_seat || null,
        flight_departure_time: data.flight_departure_time || null,
        flight_arrival_time: data.flight_arrival_time || null,
        special_instructions: data.special_instructions || null,
        is_visible_to_member: data.is_visible_to_member,
      };

      if (editingLogistics?.id) {
        // Update existing
        const { error } = await supabase
          .from('event_logistics')
          .update(payload)
          .eq('id', editingLogistics.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from('event_logistics').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-logistics'] });
      toast({
        title: '✓ Logistics Saved',
        description: editingLogistics ? 'Assignment updated' : 'Assignment created',
      });
      setIsAssignDialogOpen(false);
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

  // Delete logistics mutation
  const deleteLogisticsMutation = useMutation({
    mutationFn: async (logisticsId: string) => {
      const { error } = await supabase.from('event_logistics').delete().eq('id', logisticsId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-logistics'] });
      toast({
        title: '✓ Logistics Deleted',
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

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const { error } = await supabase
        .from('event_logistics')
        .update({
          is_visible_to_member: isVisible,
          made_visible_at: isVisible ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-logistics'] });
      toast({
        title: '✓ Visibility Updated',
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

  const resetForm = () => {
    setFormData({
      registration_id: '',
      event_trip_id: '',
      member_id: '',
      stage_name: selectedStage || '',
      hotel_name: '',
      room_number: '',
      room_type: 'double',
      sharing_with: [],
      bus_number: '',
      bus_seat_number: '',
      bus_departure_time: '',
      bus_arrival_time: '',
      train_number: '',
      train_name: '',
      train_pnr: '',
      train_coach: '',
      train_seat_berth: '',
      train_departure_time: '',
      train_arrival_time: '',
      flight_number: '',
      flight_pnr: '',
      flight_seat: '',
      flight_departure_time: '',
      flight_arrival_time: '',
      special_instructions: '',
      is_visible_to_member: false,
    });
    setEditingLogistics(null);
  };

  const openAssignDialog = () => {
    resetForm();
    setIsAssignDialogOpen(true);
  };

  const openEditDialog = (logistic: any) => {
    setEditingLogistics(logistic);
    setFormData({
      ...logistic,
      sharing_with: logistic.sharing_with || [],
      bus_departure_time: logistic.bus_departure_time
        ? format(new Date(logistic.bus_departure_time), "yyyy-MM-dd'T'HH:mm")
        : '',
      bus_arrival_time: logistic.bus_arrival_time
        ? format(new Date(logistic.bus_arrival_time), "yyyy-MM-dd'T'HH:mm")
        : '',
      train_departure_time: logistic.train_departure_time
        ? format(new Date(logistic.train_departure_time), "yyyy-MM-dd'T'HH:mm")
        : '',
      train_arrival_time: logistic.train_arrival_time
        ? format(new Date(logistic.train_arrival_time), "yyyy-MM-dd'T'HH:mm")
        : '',
      flight_departure_time: logistic.flight_departure_time
        ? format(new Date(logistic.flight_departure_time), "yyyy-MM-dd'T'HH:mm")
        : '',
      flight_arrival_time: logistic.flight_arrival_time
        ? format(new Date(logistic.flight_arrival_time), "yyyy-MM-dd'T'HH:mm")
        : '',
    });
    setIsAssignDialogOpen(true);
  };

  const handleDelete = (logisticsId: string, memberName: string) => {
    if (confirm(`Delete logistics assignment for ${memberName}?`)) {
      deleteLogisticsMutation.mutate(logisticsId);
    }
  };

  const toggleVisibility = (id: string, currentVisibility: boolean) => {
    toggleVisibilityMutation.mutate({ id, isVisible: !currentVisibility });
  };

  const exportLogistics = () => {
    if (logistics.length === 0) {
      toast({
        title: 'No Data',
        description: 'No logistics to export',
        variant: 'destructive',
      });
      return;
    }

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const csv = [
      [
        'Member ID',
        'Member Name',
        'Stage',
        'Hotel',
        'Room',
        'Room Type',
        'Sharing With',
        'Bus Number',
        'Bus Seat',
        'Train Number',
        'Train PNR',
        'Train Coach',
        'Train Seat',
        'Flight Number',
        'Flight PNR',
        'Flight Seat',
        'Visible',
        'Special Instructions',
      ],
      ...logistics.map((log: any) => [
        log.member_id,
        log.members?.full_name || '',
        log.stage_name,
        log.hotel_name || '',
        log.room_number || '',
        log.room_type || '',
        (log.sharing_with || []).join('; '),
        log.bus_number || '',
        log.bus_seat_number || '',
        log.train_number || '',
        log.train_pnr || '',
        log.train_coach || '',
        log.train_seat_berth || '',
        log.flight_number || '',
        log.flight_pnr || '',
        log.flight_seat || '',
        log.is_visible_to_member ? 'Yes' : 'No',
        log.special_instructions || '',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logistics_${selectedEvent?.activity_name.replace(/\s+/g, '_')}_${selectedStage.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({
      title: '✓ Export Complete',
      description: `${logistics.length} assignments exported`,
    });
  };

  const getTransportModeIcon = (logistic: any) => {
    const modes = [];
    if (logistic.hotel_name) modes.push({ icon: Home, color: 'text-purple-400' });
    if (logistic.bus_number) modes.push({ icon: Bus, color: 'text-blue-400' });
    if (logistic.train_number) modes.push({ icon: Train, color: 'text-[#00A36C]' });
    if (logistic.flight_number) modes.push({ icon: Plane, color: 'text-[#B8860B]' });
    return modes;
  };

  const openPreview = (memberId: string) => {
    setPreviewMemberId(memberId);
    setIsPreviewDialogOpen(true);
  };

  // Fetch logistics for preview (member view)
  const { data: previewLogistics = [] } = useQuery({
    queryKey: ['preview-logistics', previewMemberId, selectedEventId],
    queryFn: async () => {
      if (!previewMemberId || !selectedEventId) return [];

      const { data, error } = await supabase
        .from('event_logistics')
        .select('*')
        .eq('event_trip_id', selectedEventId)
        .eq('member_id', previewMemberId)
        .eq('is_visible_to_member', true)
        .order('stage_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!previewMemberId && !!selectedEventId && isPreviewDialogOpen,
  });

  if (eventsLoading) {
    return (
      <MobileLayout title="Logistics Assignment">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Logistics Assignment">
      <div className="px-4 py-4 space-y-4">
        {/* Event Selector */}
        <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
          <CardContent className="p-4">
            <Label className="text-gray-300 mb-2 block flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#00A36C]" />
              Select Event / Trip
            </Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="bg-[#1C1C1C] border-white/10 text-white">
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>
              <SelectContent className="bg-[#252525] border-white/10 max-h-[300px]">
                {events.map((event: any) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          event.activity_type === 'trip' ? 'bg-[#00A36C]' : 'bg-blue-500',
                          'text-white border-0 text-xs'
                        )}
                      >
                        {event.activity_type}
                      </Badge>
                      <span>{event.activity_name}</span>
                      <span className="text-xs text-gray-400">({event.duration_days} days)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEventId && (
          <>
            {/* Stage Selector */}
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
              <CardContent className="p-4">
                <Label className="text-gray-300 mb-2 block flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#00A36C]" />
                  Stage / Leg
                </Label>
                <Input
                  placeholder="e.g., Day 1 - Bangalore to Mumbai, Day 3 - Mumbai Hotel"
                  value={selectedStage}
                  onChange={e => setSelectedStage(e.target.value)}
                  className="bg-[#1C1C1C] border-white/10 text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Specify the stage for this logistics assignment (e.g., departure, accommodation, return)
                </p>
              </CardContent>
            </Card>

            {/* Search & Actions */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by member name or ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={openAssignDialog}
                  disabled={!selectedStage}
                  className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Logistics
                </Button>
                <Button
                  variant="outline"
                  onClick={exportLogistics}
                  disabled={logistics.length === 0}
                  className="bg-[#252525] border-white/10 text-white"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">Logistics Assignment</p>
                  <p>
                    Assign travel details for each stage of the trip. Only members with confirmed payment
                    can receive assignments. Toggle visibility when ready to share with members.
                  </p>
                </div>
              </div>
            </div>

            {/* Logistics List */}
            {logisticsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loading />
              </div>
            ) : logistics.length === 0 ? (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <MapPin className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <div className="text-gray-400 mb-2">No logistics assigned yet</div>
                  <p className="text-xs text-gray-500 mb-4">
                    {selectedStage
                      ? 'Start by assigning logistics to members'
                      : 'Enter a stage name above to begin'}
                  </p>
                  {selectedStage && (
                    <Button onClick={openAssignDialog} className="bg-[#00A36C] hover:bg-[#00A36C]/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Assign First Logistics
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-400">
                  {logistics.length} {logistics.length === 1 ? 'assignment' : 'assignments'}
                </div>

                <AnimatePresence>
                  {logistics.map((log: any, index: number) => {
                    const transportModes = getTransportModeIcon(log);
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card
                          className={cn(
                            'bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10',
                            !log.is_visible_to_member && 'opacity-75'
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00A36C] to-[#B8860B] flex items-center justify-center text-white font-bold flex-shrink-0">
                                {log.members?.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <h3 className="font-semibold text-white text-sm">
                                      {log.members?.full_name}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono">{log.member_id}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Badge
                                      className={cn(
                                        log.is_visible_to_member
                                          ? 'bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/30'
                                          : 'bg-gray-600/20 text-gray-400 border-gray-600/30',
                                        'text-xs border flex items-center gap-1'
                                      )}
                                    >
                                      {log.is_visible_to_member ? (
                                        <Eye className="h-3 w-3" />
                                      ) : (
                                        <EyeOff className="h-3 w-3" />
                                      )}
                                      {log.is_visible_to_member ? 'Visible' : 'Hidden'}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="text-xs text-gray-400 mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3" />
                                    <span>{log.stage_name}</span>
                                  </div>
                                </div>

                                {/* Transport Modes */}
                                <div className="bg-[#1C1C1C] p-2 rounded-lg mb-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    {transportModes.length > 0 ? (
                                      transportModes.map((mode, idx) => {
                                        const Icon = mode.icon;
                                        return (
                                          <div key={idx} className="flex items-center gap-1">
                                            <Icon className={cn('h-4 w-4', mode.color)} />
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span className="text-xs text-gray-500">No transport assigned</span>
                                    )}
                                  </div>
                                  <div className="space-y-1 text-xs text-gray-400">
                                    {log.hotel_name && (
                                      <div>Hotel: {log.hotel_name} - Room {log.room_number}</div>
                                    )}
                                    {log.bus_number && (
                                      <div>Bus: {log.bus_number} - Seat {log.bus_seat_number}</div>
                                    )}
                                    {log.train_number && (
                                      <div>
                                        Train: {log.train_number} - {log.train_coach}/{log.train_seat_berth}
                                      </div>
                                    )}
                                    {log.flight_number && (
                                      <div>Flight: {log.flight_number} - Seat {log.flight_seat}</div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-4 gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openPreview(log.member_id)}
                                    className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditDialog(log)}
                                    className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleVisibility(log.id, log.is_visible_to_member)}
                                    className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                  >
                                    {log.is_visible_to_member ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(log.id, log.members?.full_name)}
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
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {!selectedEventId && !eventsLoading && (
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <div className="text-gray-400 mb-2">Select an event to manage logistics</div>
              <p className="text-xs text-gray-500">
                Choose from the dropdown above to assign travel arrangements
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assign/Edit Logistics Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingLogistics ? 'Edit Logistics' : 'Assign Logistics'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Stage: {formData.stage_name || selectedStage}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="member" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-[#252525]">
              <TabsTrigger value="member" className="text-white data-[state=active]:bg-[#00A36C]">
                <Users className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="hotel" className="text-white data-[state=active]:bg-[#00A36C]">
                <Home className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="bus" className="text-white data-[state=active]:bg-[#00A36C]">
                <Bus className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="train" className="text-white data-[state=active]:bg-[#00A36C]">
                <Train className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="flight" className="text-white data-[state=active]:bg-[#00A36C]">
                <Plane className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <div className="max-h-[60vh] overflow-y-auto mt-4">
              {/* Member Selection Tab */}
              <TabsContent value="member" className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-gray-300">Select Member *</Label>
                  <Select
                    value={formData.member_id}
                    onValueChange={value => setFormData({ ...formData, member_id: value })}
                    disabled={!!editingLogistics}
                  >
                    <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                      <SelectValue placeholder="Choose member..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#252525] border-white/10 max-h-[200px]">
                      {registrations.map((reg: any) => (
                        <SelectItem key={reg.member_id} value={reg.member_id}>
                          {reg.members?.full_name} ({reg.member_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Stage Name *</Label>
                  <Input
                    placeholder="e.g., Day 1 - Departure"
                    value={formData.stage_name}
                    onChange={e => setFormData({ ...formData, stage_name: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Special Instructions</Label>
                  <Textarea
                    placeholder="Any special notes for this assignment..."
                    value={formData.special_instructions}
                    onChange={e => setFormData({ ...formData, special_instructions: e.target.value })}
                    rows={3}
                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="flex items-center justify-between bg-[#252525] p-3 rounded-lg">
                  <Label className="text-gray-300">Visible to Member</Label>
                  <Button
                    size="sm"
                    variant={formData.is_visible_to_member ? 'default' : 'outline'}
                    onClick={() =>
                      setFormData({ ...formData, is_visible_to_member: !formData.is_visible_to_member })
                    }
                    className={cn(
                      formData.is_visible_to_member
                        ? 'bg-[#00A36C] hover:bg-[#00A36C]/90'
                        : 'bg-transparent border-white/10 text-white'
                    )}
                  >
                    {formData.is_visible_to_member ? 'Yes' : 'No'}
                  </Button>
                </div>
              </TabsContent>

              {/* Hotel Tab */}
              <TabsContent value="hotel" className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-gray-300">Hotel Name</Label>
                  <Input
                    placeholder="e.g., Taj Mahal Palace"
                    value={formData.hotel_name}
                    onChange={e => setFormData({ ...formData, hotel_name: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Room Number</Label>
                    <Input
                      placeholder="e.g., 405"
                      value={formData.room_number}
                      onChange={e => setFormData({ ...formData, room_number: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Room Type</Label>
                    <Select
                      value={formData.room_type}
                      onValueChange={value => setFormData({ ...formData, room_type: value })}
                    >
                      <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#252525] border-white/10">
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="double">Double</SelectItem>
                        <SelectItem value="triple">Triple</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Sharing With (Member IDs)</Label>
                  <Input
                    placeholder="e.g., T-002, T-003 (comma-separated)"
                    value={formData.sharing_with.join(', ')}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        sharing_with: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                      })
                    }
                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </TabsContent>

              {/* Bus Tab */}
              <TabsContent value="bus" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Bus Number</Label>
                    <Input
                      placeholder="e.g., KA01AB1234"
                      value={formData.bus_number}
                      onChange={e => setFormData({ ...formData, bus_number: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Seat Number</Label>
                    <Input
                      placeholder="e.g., 12A"
                      value={formData.bus_seat_number}
                      onChange={e => setFormData({ ...formData, bus_seat_number: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Departure Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.bus_departure_time}
                    onChange={e => setFormData({ ...formData, bus_departure_time: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Arrival Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.bus_arrival_time}
                    onChange={e => setFormData({ ...formData, bus_arrival_time: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white"
                  />
                </div>
              </TabsContent>

              {/* Train Tab */}
              <TabsContent value="train" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Train Number</Label>
                    <Input
                      placeholder="e.g., 11301"
                      value={formData.train_number}
                      onChange={e => setFormData({ ...formData, train_number: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Train Name</Label>
                    <Input
                      placeholder="e.g., Udyan Express"
                      value={formData.train_name}
                      onChange={e => setFormData({ ...formData, train_name: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">PNR Number</Label>
                  <Input
                    placeholder="e.g., 1234567890"
                    value={formData.train_pnr}
                    onChange={e => setFormData({ ...formData, train_pnr: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Coach</Label>
                    <Input
                      placeholder="e.g., A1"
                      value={formData.train_coach}
                      onChange={e => setFormData({ ...formData, train_coach: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Seat/Berth</Label>
                    <Input
                      placeholder="e.g., Upper 23"
                      value={formData.train_seat_berth}
                      onChange={e => setFormData({ ...formData, train_seat_berth: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Departure Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.train_departure_time}
                    onChange={e => setFormData({ ...formData, train_departure_time: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Arrival Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.train_arrival_time}
                    onChange={e => setFormData({ ...formData, train_arrival_time: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white"
                  />
                </div>
              </TabsContent>

              {/* Flight Tab */}
              <TabsContent value="flight" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Flight Number</Label>
                    <Input
                      placeholder="e.g., AI 609"
                      value={formData.flight_number}
                      onChange={e => setFormData({ ...formData, flight_number: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">PNR Number</Label>
                    <Input
                      placeholder="e.g., ABC123"
                      value={formData.flight_pnr}
                      onChange={e => setFormData({ ...formData, flight_pnr: e.target.value })}
                      className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Seat Number</Label>
                  <Input
                    placeholder="e.g., 12A"
                    value={formData.flight_seat}
                    onChange={e => setFormData({ ...formData, flight_seat: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Departure Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.flight_departure_time}
                    onChange={e => setFormData({ ...formData, flight_departure_time: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Arrival Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.flight_arrival_time}
                    onChange={e => setFormData({ ...formData, flight_arrival_time: e.target.value })}
                    className="bg-[#252525] border-white/10 text-white"
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                resetForm();
              }}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveLogisticsMutation.mutate(formData)}
              disabled={saveLogisticsMutation.isPending || !formData.member_id || !formData.stage_name}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {saveLogisticsMutation.isPending
                ? 'Saving...'
                : editingLogistics
                  ? 'Update Logistics'
                  : 'Assign Logistics'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Member View (Token Verified)</DialogTitle>
            <DialogDescription className="text-gray-400">
              Preview of visible logistics for {previewMemberId}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto">
            {previewLogistics.length === 0 ? (
              <div className="text-center py-12">
                <EyeOff className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <div className="text-gray-400">No visible logistics yet</div>
                <p className="text-xs text-gray-500 mt-2">
                  Logistics must be marked as visible and member must verify token
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {previewLogistics.map((log: any) => (
                  <Card key={log.id} className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-[#00A36C]" />
                        <h3 className="font-semibold text-white">{log.stage_name}</h3>
                      </div>

                      {log.hotel_name && (
                        <div className="bg-[#1C1C1C] p-3 rounded-lg mb-2">
                          <div className="flex items-center gap-2 mb-1 text-purple-400">
                            <Home className="h-4 w-4" />
                            <span className="font-semibold">Accommodation</span>
                          </div>
                          <div className="text-sm text-white space-y-1">
                            <div>Hotel: {log.hotel_name}</div>
                            <div>Room: {log.room_number} ({log.room_type})</div>
                            {log.sharing_with && log.sharing_with.length > 0 && (
                              <div>Sharing with: {log.sharing_with.join(', ')}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {log.bus_number && (
                        <div className="bg-[#1C1C1C] p-3 rounded-lg mb-2">
                          <div className="flex items-center gap-2 mb-1 text-blue-400">
                            <Bus className="h-4 w-4" />
                            <span className="font-semibold">Bus</span>
                          </div>
                          <div className="text-sm text-white space-y-1">
                            <div>Bus: {log.bus_number}</div>
                            <div>Seat: {log.bus_seat_number}</div>
                            {log.bus_departure_time && (
                              <div>
                                Departure: {format(new Date(log.bus_departure_time), 'MMM dd, h:mm a')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {log.train_number && (
                        <div className="bg-[#1C1C1C] p-3 rounded-lg mb-2">
                          <div className="flex items-center gap-2 mb-1 text-[#00A36C]">
                            <Train className="h-4 w-4" />
                            <span className="font-semibold">Train</span>
                          </div>
                          <div className="text-sm text-white space-y-1">
                            <div>Train: {log.train_number} {log.train_name && `(${log.train_name})`}</div>
                            <div>PNR: {log.train_pnr}</div>
                            <div>Coach/Berth: {log.train_coach}/{log.train_seat_berth}</div>
                            {log.train_departure_time && (
                              <div>
                                Departure: {format(new Date(log.train_departure_time), 'MMM dd, h:mm a')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {log.flight_number && (
                        <div className="bg-[#1C1C1C] p-3 rounded-lg mb-2">
                          <div className="flex items-center gap-2 mb-1 text-[#B8860B]">
                            <Plane className="h-4 w-4" />
                            <span className="font-semibold">Flight</span>
                          </div>
                          <div className="text-sm text-white space-y-1">
                            <div>Flight: {log.flight_number}</div>
                            <div>PNR: {log.flight_pnr}</div>
                            <div>Seat: {log.flight_seat}</div>
                            {log.flight_departure_time && (
                              <div>
                                Departure: {format(new Date(log.flight_departure_time), 'MMM dd, h:mm a')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {log.special_instructions && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-xs text-yellow-400">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {log.special_instructions}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default EventLogistics;
