import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Users, DollarSign, Clock, Bus, FileText, Hotel, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTripDetails();
  }, [id]);

  const loadTripDetails = async () => {
    try {
      // Load trip details
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      // Check if user is registered
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberData } = await supabase
          .from('members')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (memberData) {
          // Check registration
          const { data: registration } = await supabase
            .from('trip_registrations')
            .select('*')
            .eq('trip_id', id)
            .eq('member_id', memberData.id)
            .maybeSingle();

          setIsRegistered(!!registration);

          if (registration) {
            // Load assignment details
            const { data: assignmentData } = await supabase
              .from('trip_assignments')
              .select('*')
              .eq('trip_id', id)
              .eq('member_id', memberData.id)
              .maybeSingle();

            setAssignment(assignmentData);

            // Load trip documents
            const { data: docs } = await supabase
              .from('trip_documents')
              .select('*')
              .eq('trip_id', id);

            setDocuments(docs || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading trip details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trip details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!memberData) throw new Error('Member not found');

      const { error } = await supabase
        .from('trip_registrations')
        .insert({
          trip_id: id,
          member_id: memberData.id,
          status: 'registered',
          payment_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'You have successfully registered for this trip!'
      });
      loadTripDetails();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to register for trip',
        variant: 'destructive'
      });
    }
  };

  if (loading || !trip) {
    return (
      <MainLayout title="Trip Details">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={trip.title}>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">{trip.title}</h1>
            <div className="flex items-center text-muted-foreground gap-2">
              <MapPin className="h-4 w-4" />
              <span>{trip.destination}</span>
            </div>
          </div>
          <Badge variant={trip.status === 'open' ? 'default' : 'secondary'}>
            {trip.status}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trip Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{trip.description}</p>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Departure</p>
                  <p className="text-sm text-muted-foreground">{trip.departure_time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Bus className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Transport</p>
                  <p className="text-sm text-muted-foreground">{trip.transport_type}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Capacity</p>
                  <p className="text-sm text-muted-foreground">{trip.capacity} seats</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Price</p>
                  <p className="text-sm text-muted-foreground">₹{trip.price}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isRegistered && assignment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                My Travel Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {assignment.room_number && (
                  <div>
                    <p className="text-sm font-medium">Room Number</p>
                    <p className="text-2xl font-bold text-primary">{assignment.room_number}</p>
                  </div>
                )}
                {assignment.bus_seat_number && (
                  <div>
                    <p className="text-sm font-medium">Bus Seat</p>
                    <p className="text-2xl font-bold text-primary">{assignment.bus_seat_number}</p>
                  </div>
                )}
                {assignment.train_seat_number && (
                  <div>
                    <p className="text-sm font-medium">Train Seat</p>
                    <p className="text-2xl font-bold text-primary">{assignment.train_seat_number}</p>
                  </div>
                )}
                {assignment.pnr_number && (
                  <div>
                    <p className="text-sm font-medium">PNR Number</p>
                    <p className="text-lg font-mono">{assignment.pnr_number}</p>
                  </div>
                )}
                {assignment.flight_ticket_number && (
                  <div>
                    <p className="text-sm font-medium">Flight Ticket</p>
                    <p className="text-lg font-mono">{assignment.flight_ticket_number}</p>
                  </div>
                )}
              </div>
              {assignment.additional_notes && (
                <div className="mt-4 p-3 bg-muted rounded">
                  <p className="text-sm font-medium mb-1">Additional Notes</p>
                  <p className="text-sm text-muted-foreground">{assignment.additional_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isRegistered && documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Trip Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isRegistered && trip.status === 'open' && (
          <Card>
            <CardContent className="p-6">
              <Button onClick={handleRegister} size="lg" className="w-full">
                Register for This Trip - ₹{trip.price}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default TripDetails;