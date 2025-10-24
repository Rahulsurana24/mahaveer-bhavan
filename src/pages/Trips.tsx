import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, DollarSign, Plane } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';

const Trips = () => {
  const [trips, setTrips] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      // Load all available trips
      const { data: allTrips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('status', 'open')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (tripsError) throw tripsError;
      setTrips(allTrips || []);

      // Load user's registered trips
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (memberData) {
          const { data: registrations } = await supabase
            .from('trip_registrations')
            .select(`
              *,
              trips (*)
            `)
            .eq('member_id', memberData.id);

          setMyTrips(registrations?.map(r => r.trips) || []);
        }
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trips',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const TripCard = ({ trip, showRegisterButton = true }: { trip: any; showRegisterButton?: boolean }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base text-gray-900 line-clamp-2">
              {trip.title}
            </h3>
            <div className="flex items-center text-sm text-gray-600 gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="line-clamp-1">{trip.destination}</span>
            </div>
          </div>
          <Badge variant="secondary" className="flex-shrink-0">{trip.status}</Badge>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">
          {trip.description}
        </p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Dates</p>
              <p className="text-xs font-medium text-gray-900 truncate">
                {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Capacity</p>
              <p className="text-xs font-medium text-gray-900">{trip.capacity} seats</p>
            </div>
          </div>

          <div className="flex items-center gap-2 col-span-2">
            <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="text-sm font-bold text-primary">₹{trip.price}</p>
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => navigate(`/trips/${trip.id}`)}
          size="sm"
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <MobileLayout title="Trips">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Trips">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 px-4 py-3 border-b">
          {[
            { value: "all", label: "All Trips" },
            { value: "my-trips", label: "My Trips" }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {/* handle tab change */}}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                tab.value === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trips List */}
        <div className="px-4 space-y-3 pb-4">
          {trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Plane className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips available</h3>
              <p className="text-sm text-gray-500 text-center">
                Check back later for upcoming trips and tours
              </p>
            </div>
          ) : (
            trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default Trips;