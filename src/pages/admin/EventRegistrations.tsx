import { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Filter,
  Download,
  Eye,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  AlertCircle,
  Sparkles,
  FileText,
  Hash,
  Copy,
  Send,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Loading } from '@/components/ui/loading';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Registration {
  id: string;
  event_trip_id: string;
  member_id: string;
  registration_status: string;
  payment_method: string;
  payment_status: string;
  payment_amount: number;
  payment_transaction_id: string | null;
  cash_received_by: string | null;
  cash_received_at: string | null;
  special_comments: string | null;
  created_at: string;
  members?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    membership_type: string;
  };
  event_payment_tokens?: Array<{
    token_number: string;
    token_status: string;
    verified_at: string | null;
  }>;
}

const EventRegistrations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Fetch all events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events-for-registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_trips')
        .select(`
          id,
          activity_name,
          activity_type,
          start_date,
          end_date,
          status,
          current_participants
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch registrations for selected event
  const { data: registrations = [], isLoading: registrationsLoading } = useQuery({
    queryKey: [
      'event-registrations',
      selectedEventId,
      searchTerm,
      paymentStatusFilter,
      registrationStatusFilter,
      paymentMethodFilter,
    ],
    queryFn: async () => {
      if (!selectedEventId) return [];

      let query = supabase
        .from('event_registrations')
        .select(`
          *,
          members:member_id (
            id,
            full_name,
            email,
            phone,
            membership_type
          ),
          event_payment_tokens (
            token_number,
            token_status,
            verified_at
          )
        `)
        .eq('event_trip_id', selectedEventId)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        // Search in member name, email, member_id
        query = query.or(
          `member_id.ilike.%${searchTerm}%,members.full_name.ilike.%${searchTerm}%,members.email.ilike.%${searchTerm}%`
        );
      }

      if (paymentStatusFilter !== 'all') {
        query = query.eq('payment_status', paymentStatusFilter);
      }

      if (registrationStatusFilter !== 'all') {
        query = query.eq('registration_status', registrationStatusFilter);
      }

      if (paymentMethodFilter !== 'all') {
        query = query.eq('payment_method', paymentMethodFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventId,
  });

  // Fetch registration statistics
  const { data: stats } = useQuery({
    queryKey: ['event-registration-stats', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null;

      const { data: allRegs } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_trip_id', selectedEventId);

      const { data: confirmedRegs } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_trip_id', selectedEventId)
        .eq('registration_status', 'confirmed');

      const { data: paidRegs } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_trip_id', selectedEventId)
        .eq('payment_status', 'completed');

      const { data: pendingRegs } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_trip_id', selectedEventId)
        .eq('payment_status', 'pending');

      // Calculate total revenue
      const { data: revenueData } = await supabase
        .from('event_registrations')
        .select('payment_amount')
        .eq('event_trip_id', selectedEventId)
        .eq('payment_status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, reg) => sum + (reg.payment_amount || 0), 0) || 0;

      return {
        total: allRegs?.count || 0,
        confirmed: confirmedRegs?.count || 0,
        paid: paidRegs?.count || 0,
        pending: pendingRegs?.count || 0,
        revenue: totalRevenue,
      };
    },
    enabled: !!selectedEventId,
  });

  // Fetch custom field responses for selected registration
  const { data: customResponses } = useQuery({
    queryKey: ['registration-responses', selectedRegistration?.id],
    queryFn: async () => {
      if (!selectedRegistration?.id) return [];

      const { data, error } = await supabase
        .from('event_registration_responses')
        .select(`
          *,
          event_custom_fields:custom_field_id (
            field_label,
            field_type
          )
        `)
        .eq('registration_id', selectedRegistration.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRegistration?.id && isDetailDialogOpen,
  });

  // Mark cash payment as received mutation
  const markCashReceivedMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update registration to mark cash as received
      const { error } = await supabase
        .from('event_registrations')
        .update({
          payment_status: 'completed',
          cash_received_by: user.id,
          cash_received_at: new Date().toISOString(),
        })
        .eq('id', registrationId);

      if (error) throw error;

      // Fetch the generated token (created by database trigger)
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for trigger

      const { data: tokenData } = await supabase
        .from('event_payment_tokens')
        .select('token_number')
        .eq('registration_id', registrationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return tokenData?.token_number;
    },
    onSuccess: (tokenNumber) => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['event-registration-stats'] });

      toast({
        title: '✓ Cash Payment Confirmed',
        description: tokenNumber
          ? `Token generated: ${tokenNumber}`
          : 'Registration updated successfully',
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

  const handleMarkCashReceived = (registration: Registration) => {
    if (registration.payment_status === 'completed') {
      toast({
        title: 'Already Confirmed',
        description: 'Cash payment has already been marked as received',
        variant: 'destructive',
      });
      return;
    }

    if (
      confirm(
        `Mark cash payment as received for ${registration.members?.full_name}?\n\nThis will generate a unique token and notify the member.`
      )
    ) {
      markCashReceivedMutation.mutate(registration.id);
    }
  };

  const exportRegistrations = () => {
    if (registrations.length === 0) {
      toast({
        title: 'No Data',
        description: 'No registrations to export',
        variant: 'destructive',
      });
      return;
    }

    const selectedEvent = events.find(e => e.id === selectedEventId);
    const csv = [
      [
        'Registration ID',
        'Member ID',
        'Member Name',
        'Email',
        'Phone',
        'Membership Type',
        'Registration Status',
        'Payment Method',
        'Payment Status',
        'Amount',
        'Transaction ID',
        'Token Number',
        'Token Status',
        'Registered At',
      ],
      ...registrations.map((reg: Registration) => [
        reg.id,
        reg.member_id,
        reg.members?.full_name || '',
        reg.members?.email || '',
        reg.members?.phone || '',
        reg.members?.membership_type || '',
        reg.registration_status,
        reg.payment_method,
        reg.payment_status,
        reg.payment_amount,
        reg.payment_transaction_id || '',
        reg.event_payment_tokens?.[0]?.token_number || '',
        reg.event_payment_tokens?.[0]?.token_status || '',
        format(new Date(reg.created_at), 'yyyy-MM-dd HH:mm'),
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations_${selectedEvent?.activity_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({
      title: '✓ Export Complete',
      description: `${registrations.length} registrations exported`,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '✓ Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const getRegistrationStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-500', label: 'Pending' },
      confirmed: { color: 'bg-[#00A36C]', label: 'Confirmed' },
      cancelled: { color: 'bg-red-500', label: 'Cancelled' },
      waitlist: { color: 'bg-blue-500', label: 'Waitlist' },
    };
    const { color, label } = config[status] || config.pending;
    return (
      <Badge className={cn(color, 'text-white border-0')}>
        {label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'Pending' },
      completed: { color: 'bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/30', icon: CheckCircle, label: 'Paid' },
      failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Failed' },
      refunded: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: DollarSign, label: 'Refunded' },
    };
    const { color, icon: Icon, label } = config[status] || config.pending;
    return (
      <Badge className={cn(color, 'border flex items-center gap-1')}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method: string) => {
    const config: Record<string, { color: string; label: string }> = {
      online: { color: 'bg-blue-500', label: 'Online' },
      cash: { color: 'bg-[#B8860B]', label: 'Cash' },
    };
    const { color, label } = config[method] || config.cash;
    return (
      <Badge className={cn(color, 'text-white border-0 text-xs')}>
        {label}
      </Badge>
    );
  };

  const openDetailDialog = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsDetailDialogOpen(true);
  };

  if (eventsLoading) {
    return (
      <MobileLayout title="Event Registrations">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Event Registrations">
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
                      <Badge className={cn(
                        event.activity_type === 'trip' ? 'bg-[#00A36C]' : 'bg-blue-500',
                        'text-white border-0 text-xs'
                      )}>
                        {event.activity_type}
                      </Badge>
                      <span>{event.activity_name}</span>
                      <span className="text-xs text-gray-400">
                        ({event.current_participants || 0} registered)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEventId && stats && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-[#00A36C]" />
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-[#00A36C]" />
                    <div className="text-xs text-gray-400">Confirmed</div>
                  </div>
                  <div className="text-2xl font-bold text-[#00A36C]">{stats.confirmed}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-[#B8860B]" />
                    <div className="text-xs text-gray-400">Revenue</div>
                  </div>
                  <div className="text-2xl font-bold text-[#B8860B]">
                    ₹{stats.revenue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <div className="text-xs text-gray-400">Pending</div>
                  </div>
                  <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
                </CardContent>
              </Card>
            </div>

            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or member ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#252525] border-white/10 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="flex gap-2">
                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 bg-[#252525] border-white/10 text-white"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {(paymentStatusFilter !== 'all' ||
                        registrationStatusFilter !== 'all' ||
                        paymentMethodFilter !== 'all') && (
                        <Badge className="ml-2 h-4 bg-[#00A36C] border-0">•</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="bg-[#1C1C1C] border-white/10 max-h-[80vh] overflow-y-auto"
                  >
                    <SheetHeader>
                      <SheetTitle className="text-white">Filter Registrations</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Payment Status</Label>
                        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                          <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#252525] border-white/10">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Registration Status</Label>
                        <Select
                          value={registrationStatusFilter}
                          onValueChange={setRegistrationStatusFilter}
                        >
                          <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#252525] border-white/10">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="waitlist">Waitlist</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Payment Method</Label>
                        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                          <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#252525] border-white/10">
                            <SelectItem value="all">All Methods</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 bg-[#252525] border-white/10 text-white"
                          onClick={() => {
                            setPaymentStatusFilter('all');
                            setRegistrationStatusFilter('all');
                            setPaymentMethodFilter('all');
                          }}
                        >
                          Clear
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
                  onClick={exportRegistrations}
                  disabled={registrations.length === 0}
                  className="bg-[#252525] border-white/10 text-white"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Registrations List */}
            {registrationsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loading />
              </div>
            ) : registrations.length === 0 ? (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <div className="text-gray-400">No registrations found</div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-400">
                  {registrations.length} {registrations.length === 1 ? 'registration' : 'registrations'}
                </div>

                <AnimatePresence>
                  {registrations.map((reg: Registration, index: number) => (
                    <motion.div
                      key={reg.id}
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
                              {reg.members?.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <h3 className="font-semibold text-white text-sm">
                                    {reg.members?.full_name}
                                  </h3>
                                  <p className="text-xs text-gray-400 font-mono">{reg.member_id}</p>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                  {getRegistrationStatusBadge(reg.registration_status)}
                                  {getPaymentMethodBadge(reg.payment_method)}
                                </div>
                              </div>

                              <div className="space-y-1 text-xs text-gray-400 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{reg.members?.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3 w-3" />
                                  <span>{reg.members?.phone}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>
                                    Registered {format(new Date(reg.created_at), 'MMM dd, yyyy')}
                                  </span>
                                </div>
                              </div>

                              {/* Payment Info */}
                              <div className="bg-[#1C1C1C] p-2 rounded-lg mb-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-400">Payment</span>
                                  {getPaymentStatusBadge(reg.payment_status)}
                                </div>
                                <div className="text-white font-bold mt-1">
                                  ₹{reg.payment_amount?.toLocaleString()}
                                </div>
                                {reg.event_payment_tokens?.[0] && (
                                  <div className="mt-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-400">Token</span>
                                      <Badge
                                        className={cn(
                                          reg.event_payment_tokens[0].token_status === 'verified'
                                            ? 'bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/30'
                                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                                          'text-xs border'
                                        )}
                                      >
                                        {reg.event_payment_tokens[0].token_status}
                                      </Badge>
                                    </div>
                                    <div className="text-white font-mono text-sm mt-1">
                                      {reg.event_payment_tokens[0].token_number}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDetailDialog(reg)}
                                  className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                                {reg.payment_method === 'cash' && reg.payment_status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarkCashReceived(reg)}
                                    disabled={markCashReceivedMutation.isPending}
                                    className="h-8 bg-[#00A36C] hover:bg-[#00A36C]/90"
                                  >
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Mark Received
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {!selectedEventId && !eventsLoading && (
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <div className="text-gray-400 mb-2">Select an event to view registrations</div>
              <p className="text-xs text-gray-500">
                Choose from the dropdown above to manage event registrations
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Registration Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Registration Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRegistration?.members?.full_name} - {selectedRegistration?.member_id}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="member" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#252525]">
              <TabsTrigger value="member" className="text-white data-[state=active]:bg-[#00A36C]">
                Member
              </TabsTrigger>
              <TabsTrigger value="payment" className="text-white data-[state=active]:bg-[#00A36C]">
                Payment
              </TabsTrigger>
              <TabsTrigger value="responses" className="text-white data-[state=active]:bg-[#00A36C]">
                Responses
              </TabsTrigger>
            </TabsList>

            <div className="max-h-[60vh] overflow-y-auto mt-4">
              {/* Member Info Tab */}
              <TabsContent value="member" className="space-y-3">
                <div className="bg-[#252525] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Full Name</div>
                  <div className="text-white flex items-center justify-between">
                    <span>{selectedRegistration?.members?.full_name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          selectedRegistration?.members?.full_name || '',
                          'Name'
                        )
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="bg-[#252525] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Member ID</div>
                  <div className="text-white font-mono flex items-center justify-between">
                    <span>{selectedRegistration?.member_id}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(selectedRegistration?.member_id || '', 'Member ID')
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="bg-[#252525] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Email</div>
                  <div className="text-white flex items-center justify-between">
                    <span className="truncate">{selectedRegistration?.members?.email}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(selectedRegistration?.members?.email || '', 'Email')
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="bg-[#252525] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Phone</div>
                  <div className="text-white flex items-center justify-between">
                    <span>{selectedRegistration?.members?.phone}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(selectedRegistration?.members?.phone || '', 'Phone')
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="bg-[#252525] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Membership Type</div>
                  <div className="text-white">
                    <Badge className="bg-gradient-to-r from-[#00A36C] to-[#B8860B] text-white border-0">
                      {selectedRegistration?.members?.membership_type}
                    </Badge>
                  </div>
                </div>
                {selectedRegistration?.special_comments && (
                  <div className="bg-[#252525] p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Special Comments</div>
                    <div className="text-white">{selectedRegistration.special_comments}</div>
                  </div>
                )}
              </TabsContent>

              {/* Payment Info Tab */}
              <TabsContent value="payment" className="space-y-3">
                <div className="bg-[#252525] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Payment Method</div>
                  <div className="text-white">
                    {getPaymentMethodBadge(selectedRegistration?.payment_method || '')}
                  </div>
                </div>
                <div className="bg-[#252525] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Payment Status</div>
                  <div className="text-white">
                    {getPaymentStatusBadge(selectedRegistration?.payment_status || '')}
                  </div>
                </div>
                <div className="bg-[#252525] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Amount</div>
                  <div className="text-white text-xl font-bold">
                    ₹{selectedRegistration?.payment_amount?.toLocaleString()}
                  </div>
                </div>
                {selectedRegistration?.payment_transaction_id && (
                  <div className="bg-[#252525] p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Transaction ID</div>
                    <div className="text-white font-mono text-sm flex items-center justify-between">
                      <span className="truncate">{selectedRegistration.payment_transaction_id}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(
                            selectedRegistration.payment_transaction_id || '',
                            'Transaction ID'
                          )
                        }
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {selectedRegistration?.event_payment_tokens?.[0] && (
                  <div className="bg-gradient-to-br from-[#00A36C]/10 to-[#B8860B]/10 border border-[#00A36C]/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-[#00A36C]" />
                      <span className="text-white font-semibold">Payment Token</span>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-[#1C1C1C] p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Token Number</div>
                        <div className="text-white font-mono text-lg flex items-center justify-between">
                          <span>{selectedRegistration.event_payment_tokens[0].token_number}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(
                                selectedRegistration.event_payment_tokens![0].token_number,
                                'Token'
                              )
                            }
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-[#1C1C1C] p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Token Status</div>
                        <div className="text-white">
                          <Badge
                            className={cn(
                              selectedRegistration.event_payment_tokens[0].token_status === 'verified'
                                ? 'bg-[#00A36C] border-0'
                                : 'bg-yellow-500 border-0'
                            )}
                          >
                            {selectedRegistration.event_payment_tokens[0].token_status}
                          </Badge>
                        </div>
                      </div>
                      {selectedRegistration.event_payment_tokens[0].verified_at && (
                        <div className="bg-[#1C1C1C] p-3 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Verified At</div>
                          <div className="text-white">
                            {format(
                              new Date(selectedRegistration.event_payment_tokens[0].verified_at),
                              'MMM dd, yyyy h:mm a'
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedRegistration?.payment_method === 'cash' &&
                  selectedRegistration?.payment_status === 'pending' && (
                    <Button
                      onClick={() =>
                        selectedRegistration && handleMarkCashReceived(selectedRegistration)
                      }
                      disabled={markCashReceivedMutation.isPending}
                      className="w-full bg-[#00A36C] hover:bg-[#00A36C]/90"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Mark Cash as Received
                    </Button>
                  )}
              </TabsContent>

              {/* Custom Responses Tab */}
              <TabsContent value="responses" className="space-y-3">
                {customResponses && customResponses.length > 0 ? (
                  customResponses.map((response: any) => (
                    <div key={response.id} className="bg-[#252525] p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">
                        {response.event_custom_fields?.field_label}
                      </div>
                      <div className="text-white">{response.response_value}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Type: {response.event_custom_fields?.field_type}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-[#252525] p-8 rounded-lg text-center">
                    <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <div className="text-gray-400 text-sm">No custom responses</div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default EventRegistrations;
