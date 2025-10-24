import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Users,
  Search,
  CheckCircle,
  DollarSign,
  FileText,
  Shield,
  AlertCircle,
  Download,
  X,
  Bus,
  Hotel,
  ChevronRight,
  Filter,
  Plane,
  Train,
  ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMemberData } from "@/hooks/useMemberData";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const Events = () => {
  const { member } = useMemberData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("events");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [specialComments, setSpecialComments] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Fetch events
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['events', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .eq('is_published', true)
        .order('date', { ascending: true });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch trips
  const { data: trips, isLoading: loadingTrips } = useQuery({
    queryKey: ['trips', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('trips')
        .select('*')
        .eq('is_published', true)
        .order('start_date', { ascending: true });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,destination.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch registrations
  const { data: registrations } = useQuery({
    queryKey: ['my-registrations', member?.id],
    queryFn: async () => {
      if (!member) return { events: [], trips: [] };

      const { data: eventRegs } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events (*)
        `)
        .eq('member_id', member.id);

      const { data: tripRegs } = await supabase
        .from('trip_registrations')
        .select(`
          *,
          trips (*),
          trip_assignments (*)
        `)
        .eq('member_id', member.id);

      return {
        events: eventRegs || [],
        trips: tripRegs || []
      };
    },
    enabled: !!member
  });

  // Fetch Razorpay settings
  const { data: razorpaySettings } = useQuery({
    queryKey: ['razorpay-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .in('setting_key', ['razorpay_key_id', 'razorpay_key_secret'])
        .limit(2);

      if (error) throw error;
      const keyId = data.find(s => s.setting_key === 'razorpay_key_id')?.setting_value;
      return { keyId };
    }
  });

  // Calculate dynamic price based on membership type
  const calculatePrice = (activity: any) => {
    if (!member?.membership_type) return activity.price || activity.base_price || 0;

    const membershipType = member.membership_type.toLowerCase();

    if (activity.price_tapasvi && membershipType === 'tapasvi') {
      return activity.price_tapasvi;
    } else if (activity.price_regular && membershipType === 'regular') {
      return activity.price_regular;
    } else if (activity.price_patron && membershipType === 'patron') {
      return activity.price_patron;
    }

    return activity.price || activity.base_price || 0;
  };

  // Check eligibility
  const checkEligibility = (activity: any) => {
    if (!activity.eligible_membership_types || activity.eligible_membership_types.length === 0) {
      return { eligible: true, message: 'Open to all members' };
    }

    const membershipType = member?.membership_type?.toLowerCase();
    const eligibleTypes = activity.eligible_membership_types.map((t: string) => t.toLowerCase());

    if (eligibleTypes.includes(membershipType)) {
      return { eligible: true, message: 'You are eligible' };
    }

    return {
      eligible: false,
      message: `Only for ${activity.eligible_membership_types.join(', ')} members`
    };
  };

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async ({ activity, price, type }: { activity: any; price: number; type: 'event' | 'trip' }) => {
      if (!member) throw new Error('Not authenticated');

      // Create registration record
      const tableName = type === 'event' ? 'event_registrations' : 'trip_registrations';
      const idField = type === 'event' ? 'event_id' : 'trip_id';

      const registrationData: any = {
        [idField]: activity.id,
        member_id: member.id,
        status: price > 0 ? 'pending_payment' : 'registered',
        special_comments: specialComments || null,
        custom_fields: customFieldValues
      };

      if (price > 0) {
        registrationData.payment_status = 'pending';
        registrationData.amount = price;
      }

      const { data: registration, error } = await supabase
        .from(tableName)
        .insert(registrationData)
        .select()
        .single();

      if (error) throw error;

      return { registration, price, type };
    },
    onSuccess: ({ registration, price, type }) => {
      if (price > 0) {
        initializeRazorpay(registration, price, type);
      } else {
        toast({
          title: "Registration Successful",
          description: "You have been registered for this activity",
        });
        setIsDetailsOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register",
        variant: "destructive",
      });
    }
  });

  // Initialize Razorpay
  const initializeRazorpay = (registration: any, amount: number, type: 'event' | 'trip') => {
    if (!razorpaySettings?.keyId) {
      toast({
        title: "Error",
        description: "Payment gateway not configured",
        variant: "destructive",
      });
      return;
    }

    const options = {
      key: razorpaySettings.keyId,
      amount: amount * 100, // paise
      currency: 'INR',
      name: 'Sree Mahaveer Swami Charitable Trust',
      description: `Registration for ${selectedActivity?.title}`,
      handler: async function (response: any) {
        const tableName = type === 'event' ? 'event_registrations' : 'trip_registrations';

        await supabase
          .from(tableName)
          .update({
            status: 'registered',
            payment_status: 'completed',
            razorpay_payment_id: response.razorpay_payment_id,
            paid_at: new Date().toISOString()
          })
          .eq('id', registration.id);

        queryClient.invalidateQueries({ queryKey: ['my-registrations'] });

        toast({
          title: "Payment Successful!",
          description: "You have been successfully registered",
        });

        setIsDetailsOpen(false);
        setSpecialComments("");
        setCustomFieldValues({});
      },
      prefill: {
        name: member?.full_name,
        email: member?.email,
        contact: member?.phone
      },
      theme: {
        color: '#00A36C'
      }
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };

  // Cancel registration mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ registrationId, type }: { registrationId: string; type: 'event' | 'trip' }) => {
      const tableName = type === 'event' ? 'event_registrations' : 'trip_registrations';

      const { error } = await supabase
        .from(tableName)
        .update({ status: 'cancelled' })
        .eq('id', registrationId);

      if (error) throw error;

      // Create admin notification
      await supabase
        .from('admin_notifications')
        .insert({
          type: 'registration_cancelled',
          title: `${type === 'event' ? 'Event' : 'Trip'} Registration Cancelled`,
          message: `${member?.full_name} has cancelled their registration`,
          member_id: member?.id
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      toast({
        title: "Registration Cancelled",
        description: "Your registration has been cancelled",
      });
    }
  });

  const handleOpenDetails = (activity: any, type: 'event' | 'trip') => {
    setSelectedActivity({ ...activity, type });
    setIsDetailsOpen(true);
  };

  const handleRegister = () => {
    if (!selectedActivity) return;

    const price = calculatePrice(selectedActivity);
    const type = selectedActivity.type;

    registerMutation.mutate({ activity: selectedActivity, price, type });
  };

  const isActivityRegistered = (activityId: string, type: 'event' | 'trip') => {
    if (!registrations) return false;

    if (type === 'event') {
      return registrations.events.some((r: any) => r.event_id === activityId);
    } else {
      return registrations.trips.some((r: any) => r.trip_id === activityId);
    }
  };

  const getActivityStatus = (activity: any, type: 'event' | 'trip') => {
    if (isActivityRegistered(activity.id, type)) {
      return { label: 'Registered', color: 'bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/30' };
    }

    const eligibility = checkEligibility(activity);
    if (!eligibility.eligible) {
      return { label: 'Not Eligible', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    }

    if (activity.status === 'full' || activity.is_full) {
      return { label: 'Full', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    }

    return { label: 'Open', color: 'bg-[#B8860B]/20 text-[#B8860B] border-[#B8860B]/30' };
  };

  const renderActivityCard = (activity: any, type: 'event' | 'trip') => {
    const price = calculatePrice(activity);
    const status = getActivityStatus(activity, type);
    const isRegistered = isActivityRegistered(activity.id, type);

    const startDate = type === 'event' ? new Date(activity.date) : new Date(activity.start_date);
    const endDate = type === 'trip' ? new Date(activity.end_date) : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        key={activity.id}
      >
        <Card
          className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 overflow-hidden cursor-pointer hover:border-[#00A36C]/30 transition-all"
          onClick={() => handleOpenDetails(activity, type)}
        >
          <CardContent className="p-0">
            {/* Image */}
            {activity.image_url && (
              <div className="relative aspect-video bg-black">
                <img
                  src={activity.image_url}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
                <Badge className={cn("absolute top-3 right-3 border", status.color)}>
                  {status.label}
                </Badge>
              </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-white text-lg line-clamp-2 mb-1">
                  {activity.title}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {activity.description}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <CalendarIcon className="h-4 w-4 text-[#B8860B]" />
                  <span>
                    {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {endDate && ` - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <MapPin className="h-4 w-4 text-[#B8860B]" />
                  <span className="line-clamp-1">{type === 'event' ? activity.location : activity.destination}</span>
                </div>

                {type === 'event' && activity.time && (
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <Clock className="h-4 w-4 text-[#B8860B]" />
                    <span>{activity.time}</span>
                  </div>
                )}

                {type === 'trip' && activity.transport_type && (
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <Bus className="h-4 w-4 text-[#B8860B]" />
                    <span>{activity.transport_type}</span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#00A36C]" />
                  <div>
                    <p className="text-xs text-gray-400">
                      Your Fee ({member?.membership_type || 'Member'})
                    </p>
                    <p className="text-xl font-bold text-white">₹{price.toLocaleString()}</p>
                  </div>
                </div>

                <ChevronRight className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <MobileLayout title="Events & Trips">
      <div className="min-h-screen bg-[#1C1C1C]">
        {/* Search Bar */}
        <div className="sticky top-14 z-30 bg-gradient-to-b from-[#252525] to-[#1C1C1C] border-b border-white/10 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events and trips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-gradient-to-r from-[#252525] to-[#1C1C1C] border-b border-white/10 rounded-none h-14 px-4">
            <TabsTrigger
              value="events"
              className="flex-1 data-[state=active]:bg-[#00A36C] data-[state=active]:text-white"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger
              value="trips"
              className="flex-1 data-[state=active]:bg-[#00A36C] data-[state=active]:text-white"
            >
              <Bus className="h-4 w-4 mr-2" />
              Trips
            </TabsTrigger>
            <TabsTrigger
              value="registered"
              className="flex-1 data-[state=active]:bg-[#00A36C] data-[state=active]:text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              My Activities
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="px-4 py-6 space-y-4">
            {loadingEvents ? (
              <div className="flex justify-center py-12">
                <Loading size="lg" />
              </div>
            ) : events && events.length > 0 ? (
              <AnimatePresence>
                {events.map((event) => renderActivityCard(event, 'event'))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <CalendarIcon className="h-16 w-16 text-gray-600 mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">No events found</h3>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? "Try a different search term" : "No upcoming events at the moment"}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Trips Tab */}
          <TabsContent value="trips" className="px-4 py-6 space-y-4">
            {loadingTrips ? (
              <div className="flex justify-center py-12">
                <Loading size="lg" />
              </div>
            ) : trips && trips.length > 0 ? (
              <AnimatePresence>
                {trips.map((trip) => renderActivityCard(trip, 'trip'))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Bus className="h-16 w-16 text-gray-600 mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">No trips found</h3>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? "Try a different search term" : "No upcoming trips at the moment"}
                </p>
              </div>
            )}
          </TabsContent>

          {/* My Registered Activities Tab */}
          <TabsContent value="registered" className="px-4 py-6 space-y-6">
            {registrations && (registrations.events.length > 0 || registrations.trips.length > 0) ? (
              <>
                {/* Registered Events */}
                {registrations.events.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-[#B8860B]" />
                      Registered Events
                    </h3>
                    <div className="space-y-3">
                      {registrations.events.map((reg: any) => (
                        <Card key={reg.id} className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="text-white font-semibold text-base mb-1">{reg.events.title}</h4>
                                <p className="text-gray-400 text-sm line-clamp-1">{reg.events.description}</p>
                              </div>
                              <Badge className="bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30 ml-2">
                                {reg.status}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-sm text-gray-300 mb-3">
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-3 w-3 text-[#B8860B]" />
                                <span>{new Date(reg.events.date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-[#B8860B]" />
                                <span>{reg.events.location}</span>
                              </div>
                            </div>

                            {reg.status !== 'cancelled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelMutation.mutate({ registrationId: reg.id, type: 'event' })}
                                className="w-full bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                              >
                                Cancel Registration
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registered Trips */}
                {registrations.trips.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                      <Bus className="h-4 w-4 text-[#B8860B]" />
                      Registered Trips
                    </h3>
                    <div className="space-y-3">
                      {registrations.trips.map((reg: any) => {
                        const assignment = reg.trip_assignments?.[0];

                        return (
                          <Card key={reg.id} className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="text-white font-semibold text-base mb-1">{reg.trips.title}</h4>
                                  <p className="text-gray-400 text-sm line-clamp-1">{reg.trips.description}</p>
                                </div>
                                <Badge className="bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30 ml-2">
                                  {reg.status}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm text-gray-300">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-3 w-3 text-[#B8860B]" />
                                  <span>
                                    {new Date(reg.trips.start_date).toLocaleDateString()} -{' '}
                                    {new Date(reg.trips.end_date).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 text-[#B8860B]" />
                                  <span>{reg.trips.destination}</span>
                                </div>
                              </div>

                              {/* Logistics Assignment */}
                              {assignment && (
                                <div className="pt-3 border-t border-white/10">
                                  <h5 className="text-white font-semibold text-xs mb-2 flex items-center gap-2">
                                    <Hotel className="h-3 w-3 text-[#00A36C]" />
                                    Your Travel Assignments
                                  </h5>
                                  <div className="grid grid-cols-2 gap-2">
                                    {assignment.room_number && (
                                      <div className="p-2 bg-[#00A36C]/10 rounded-lg border border-[#00A36C]/20">
                                        <p className="text-xs text-gray-400">Room</p>
                                        <p className="text-base font-bold text-[#00A36C]">{assignment.room_number}</p>
                                      </div>
                                    )}
                                    {assignment.bus_seat_number && (
                                      <div className="p-2 bg-[#00A36C]/10 rounded-lg border border-[#00A36C]/20">
                                        <p className="text-xs text-gray-400">Bus Seat</p>
                                        <p className="text-base font-bold text-[#00A36C]">{assignment.bus_seat_number}</p>
                                      </div>
                                    )}
                                    {assignment.train_seat_number && (
                                      <div className="p-2 bg-[#00A36C]/10 rounded-lg border border-[#00A36C]/20">
                                        <p className="text-xs text-gray-400">Train Seat</p>
                                        <p className="text-base font-bold text-[#00A36C]">{assignment.train_seat_number}</p>
                                      </div>
                                    )}
                                    {assignment.pnr_number && (
                                      <div className="p-2 bg-[#00A36C]/10 rounded-lg border border-[#00A36C]/20 col-span-2">
                                        <p className="text-xs text-gray-400">PNR Number</p>
                                        <p className="text-sm font-mono font-medium text-white">{assignment.pnr_number}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {reg.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelMutation.mutate({ registrationId: reg.id, type: 'trip' })}
                                  className="w-full bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                                >
                                  Cancel Registration
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <CheckCircle className="h-16 w-16 text-gray-600 mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">No registrations yet</h3>
                <p className="text-gray-400 text-sm text-center mb-4">
                  Register for events and trips to see them here
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setActiveTab('events')}
                    className="bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C]"
                  >
                    Browse Events
                  </Button>
                  <Button
                    onClick={() => setActiveTab('trips')}
                    className="bg-gradient-to-r from-[#B8860B] to-[#9a7209] hover:from-[#9a7209] hover:to-[#B8860B]"
                  >
                    Browse Trips
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="bg-[#252525] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">{selectedActivity?.title}</DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedActivity?.type === 'event' ? 'Event Details' : 'Trip Details'}
              </DialogDescription>
            </DialogHeader>

            {selectedActivity && (
              <div className="space-y-4">
                {/* Image */}
                {selectedActivity.image_url && (
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <img src={selectedActivity.image_url} alt={selectedActivity.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="text-white font-semibold text-sm mb-2">Description</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{selectedActivity.description}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Date</p>
                    <p className="text-sm text-white font-medium">
                      {selectedActivity.type === 'event'
                        ? new Date(selectedActivity.date).toLocaleDateString()
                        : `${new Date(selectedActivity.start_date).toLocaleDateString()} - ${new Date(selectedActivity.end_date).toLocaleDateString()}`}
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Location</p>
                    <p className="text-sm text-white font-medium line-clamp-1">
                      {selectedActivity.type === 'event' ? selectedActivity.location : selectedActivity.destination}
                    </p>
                  </div>

                  {selectedActivity.type === 'event' && selectedActivity.time && (
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Time</p>
                      <p className="text-sm text-white font-medium">{selectedActivity.time}</p>
                    </div>
                  )}

                  {selectedActivity.type === 'trip' && selectedActivity.transport_type && (
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Transport</p>
                      <p className="text-sm text-white font-medium">{selectedActivity.transport_type}</p>
                    </div>
                  )}

                  {selectedActivity.capacity && (
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs text-gray-400 mb-1">Capacity</p>
                      <p className="text-sm text-white font-medium">{selectedActivity.capacity} seats</p>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <Card className="bg-gradient-to-r from-[#00A36C]/20 to-[#B8860B]/20 border-[#00A36C]/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-300 text-sm">Your Fee ({member?.membership_type || 'Member'})</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {checkEligibility(selectedActivity).message}
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-white">₹{calculatePrice(selectedActivity).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Special Comments */}
                {!isActivityRegistered(selectedActivity.id, selectedActivity.type) && (
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Special Comments & Requests (Optional)</Label>
                    <Textarea
                      placeholder="e.g., Dietary restrictions, accommodation needs, arrival time..."
                      value={specialComments}
                      onChange={(e) => setSpecialComments(e.target.value)}
                      rows={4}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 resize-none"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailsOpen(false)}
                    className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Close
                  </Button>

                  {!isActivityRegistered(selectedActivity.id, selectedActivity.type) && checkEligibility(selectedActivity).eligible && (
                    <Button
                      onClick={handleRegister}
                      disabled={registerMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C]"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loading size="sm" />
                          <span className="ml-2">Registering...</span>
                        </>
                      ) : (
                        `Register - ₹${calculatePrice(selectedActivity)}`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default Events;
