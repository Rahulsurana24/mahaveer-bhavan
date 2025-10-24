import { useState, useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users,
  Search,
  CheckCircle
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useMemberData } from '@/hooks/useMemberData';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';
import { cn } from "@/lib/utils";

const Events = () => {
  const { member } = useMemberData();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [member]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_published', true)
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);

      if (member?.id) {
        const { data: regs } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('member_id', member.id);

        setRegistrations(new Set(regs?.map(r => r.event_id) || []));
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    if (!member?.id) {
      toast({
        title: 'Error',
        description: 'Please login to register',
        variant: 'destructive'
      });
      return;
    }

    setRegistering(true);
    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          member_id: member.id,
          status: 'registered'
        });

      if (error) throw error;

      setRegistrations(prev => new Set(prev).add(eventId));
      toast({
        title: 'Success',
        description: 'Successfully registered for event'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to register',
        variant: 'destructive'
      });
    } finally {
      setRegistering(false);
    }
  };

  const getEventsByTab = (tab: string) => {
    const now = new Date();
    switch (tab) {
      case "upcoming":
        return events.filter(e => new Date(e.date) >= now);
      case "registered":
        return events.filter(e => registrations.has(e.id));
      case "past":
        return events.filter(e => new Date(e.date) < now);
      default:
        return events;
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Events">
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Events">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="sticky top-0 z-10 bg-white px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              className="pl-10 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
          {["upcoming", "registered", "past"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === tab
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {tab === "upcoming" && "Upcoming"}
              {tab === "registered" && "My Events"}
              {tab === "past" && "Past"}
            </button>
          ))}
        </div>

        {/* Events List */}
        <div className="px-4 space-y-3 pb-4">
          {getEventsByTab(activeTab).map((event) => {
            const isRegistered = registrations.has(event.id);
            const eventDate = new Date(event.date);
            const isPast = eventDate < new Date();
            
            return (
              <Card key={event.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Event Image */}
                  {event.image_url && (
                    <div className="relative aspect-video bg-gray-100">
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      {isRegistered && (
                        <Badge className="absolute top-2 right-2 bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Registered
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Event Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-base text-gray-900 line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {event.description}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{event.time || 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                      {event.capacity && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="h-4 w-4 flex-shrink-0" />
                          <span>{event.capacity} seats</span>
                        </div>
                      )}
                    </div>

                    {!isRegistered && !isPast && (
                      <Button 
                        onClick={() => handleRegister(event.id)}
                        className="w-full"
                        disabled={registering}
                        size="sm"
                      >
                        {registering ? "Registering..." : "Register Now"}
                      </Button>
                    )}

                    {isPast && (
                      <Badge variant="secondary" className="w-full justify-center">
                        Event Ended
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Empty State */}
          {getEventsByTab(activeTab).length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Calendar className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
              <p className="text-sm text-gray-500 text-center">
                {activeTab === "upcoming" && "No upcoming events at the moment."}
                {activeTab === "registered" && "You haven't registered for any events yet."}
                {activeTab === "past" && "No past events to display."}
              </p>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default Events;