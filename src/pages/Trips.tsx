import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Calendar, Users, DollarSign, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{trip.title}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <MapPin className="h-4 w-4" />
              <span>{trip.destination}</span>
            </div>
          </div>
          <Badge variant="secondary">{trip.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {trip.description}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Dates</p>
              <p className="text-muted-foreground">
                {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Time</p>
              <p className="text-muted-foreground">
                {trip.departure_time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Capacity</p>
              <p className="text-muted-foreground">{trip.capacity} seats</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Price</p>
              <p className="text-muted-foreground">₹{trip.price}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => navigate(`/trips/${trip.id}`)}
          >
            View Details
          </Button>
          {showRegisterButton && (
            <Button
              variant="outline"
              onClick={() => navigate(`/trips/${trip.id}/register`)}
            >
              Register
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <MainLayout title="Trips">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Trips & Tours">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Trips & Tours</h1>

        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Trips</TabsTrigger>
            <TabsTrigger value="my-trips">My Registered Trips</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {trips.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No upcoming trips available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-trips" className="space-y-4 mt-6">
            {myTrips.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">You haven't registered for any trips yet</p>
                  <Button className="mt-4" onClick={() => navigate('/trips')}>
                    Browse Available Trips
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} showRegisterButton={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Trips;