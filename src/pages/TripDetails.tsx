import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, DollarSign, Clock, Bus, FileText, Hotel, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TripRegistrationDialog } from '@/components/trips/TripRegistrationDialog';
import { Loading } from '@/components/ui/loading';

const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
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
          setMemberId(memberData.id);
          
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

  const handleRegister = () => {
    if (!memberId) {
      navigate('/auth');
      return;
    }
    setIsRegistrationDialogOpen(true);
  };

  if (loading || !trip) {
    return (
      <MobileLayout title="Trip Details">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={trip.title}>
      <div className="space-y-4 px-4 pb-4">
        {/* Header */}
        <div className="pt-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-xl font-bold line-clamp-2">{trip.title}</h1>
            <Badge variant={trip.status === 'open' ? 'default' : 'secondary'} className="flex-shrink-0">
              {trip.status}
            </Badge>
          </div>
          <div className="flex items-center text-gray-600 gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{trip.destination}</span>
          </div>
        </div>

        {/* Description */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 leading-relaxed">{trip.description}</p>
          </CardContent>
        </Card>

        {/* Trip Information Grid */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Trip Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Dates</p>
                  <p className="text-xs font-medium">
                    {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Departure</p>
                  <p className="text-xs font-medium">{trip.departure_time}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Bus className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Transport</p>
                  <p className="text-xs font-medium">{trip.transport_type}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="text-xs font-medium">{trip.capacity} seats</p>
                </div>
              </div>
            </div>

            {/* Price - Prominent Display */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-sm text-gray-500">Trip Fee</span>
              </div>
              <span className="text-2xl font-bold text-primary">₹{trip.price}</span>
            </div>
          </CardContent>
        </Card>

        {/* Travel Assignments */}
        {isRegistered && assignment && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <Hotel className="h-4 w-4 text-primary" />
                My Travel Assignments
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {assignment.room_number && (
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Room</p>
                    <p className="text-xl font-bold text-primary">{assignment.room_number}</p>
                  </div>
                )}
                {assignment.bus_seat_number && (
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Bus Seat</p>
                    <p className="text-xl font-bold text-primary">{assignment.bus_seat_number}</p>
                  </div>
                )}
                {assignment.train_seat_number && (
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Train Seat</p>
                    <p className="text-xl font-bold text-primary">{assignment.train_seat_number}</p>
                  </div>
                )}
                {assignment.pnr_number && (
                  <div className="p-3 bg-primary/5 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 mb-1">PNR Number</p>
                    <p className="text-base font-mono font-medium">{assignment.pnr_number}</p>
                  </div>
                )}
                {assignment.flight_ticket_number && (
                  <div className="p-3 bg-primary/5 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Flight Ticket</p>
                    <p className="text-base font-mono font-medium">{assignment.flight_ticket_number}</p>
                  </div>
                )}
              </div>
              {assignment.additional_notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-1">Additional Notes</p>
                  <p className="text-xs text-gray-600">{assignment.additional_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trip Documents */}
        {isRegistered && documents.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Trip Documents
              </h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-sm">{doc.title}</p>
                      {doc.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{doc.description}</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="flex-shrink-0">
                      <Download className="h-3 w-3 mr-1" />
                      Get
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Button */}
        {!isRegistered && trip.status === 'open' && (
          <Button onClick={handleRegister} size="lg" className="w-full sticky bottom-4">
            Register for Trip - ₹{trip.price}
          </Button>
        )}
      </div>

      {/* Registration Dialog */}
      {memberId && (
        <TripRegistrationDialog
          tripId={id!}
          tripTitle={trip.title}
          tripPrice={trip.price}
          memberId={memberId}
          open={isRegistrationDialogOpen}
          onOpenChange={setIsRegistrationDialogOpen}
          onSuccess={loadTripDetails}
        />
      )}
    </MobileLayout>
  );
};

export default TripDetails;