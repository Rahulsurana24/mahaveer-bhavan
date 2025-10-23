import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plane, Save, Hotel, Bus, Train } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TripLogisticsManagerProps {
  tripId: string;
}

interface Assignment {
  member_id: string;
  room_number: string;
  bus_seat_number: string;
  train_seat_number: string;
  pnr_number: string;
  flight_ticket_number: string;
  additional_notes: string;
}

interface MemberRegistration {
  id: string;
  member_id: string;
  status: string;
  payment_status: string;
  members: {
    id: string;
    full_name: string;
    membership_type: string;
    phone: string;
  };
}

export function TripLogisticsManager({ tripId }: TripLogisticsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});

  // Fetch registered members
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['trip-registrations', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_registrations')
        .select(`
          id,
          member_id,
          status,
          payment_status,
          members (
            id,
            full_name,
            membership_type,
            phone
          )
        `)
        .eq('trip_id', tripId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as MemberRegistration[];
    }
  });

  // Fetch existing assignments
  const { data: existingAssignments } = useQuery({
    queryKey: ['trip-assignments', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_assignments')
        .select('*')
        .eq('trip_id', tripId);

      if (error) throw error;
      return data;
    }
  });

  // Initialize assignments from existing data
  useEffect(() => {
    if (existingAssignments) {
      const assignmentMap: Record<string, Assignment> = {};
      existingAssignments.forEach((assignment: any) => {
        assignmentMap[assignment.member_id] = {
          member_id: assignment.member_id,
          room_number: assignment.room_number || '',
          bus_seat_number: assignment.bus_seat_number || '',
          train_seat_number: assignment.train_seat_number || '',
          pnr_number: assignment.pnr_number || '',
          flight_ticket_number: assignment.flight_ticket_number || '',
          additional_notes: assignment.additional_notes || ''
        };
      });
      setAssignments(assignmentMap);
    }
  }, [existingAssignments]);

  const updateAssignment = (memberId: string, field: keyof Assignment, value: string) => {
    setAssignments(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        member_id: memberId,
        [field]: value
      }
    }));
  };

  // Save assignments mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const assignmentsList = Object.values(assignments).filter(a =>
        a.room_number || a.bus_seat_number || a.train_seat_number ||
        a.pnr_number || a.flight_ticket_number || a.additional_notes
      );

      // Delete existing assignments
      await supabase
        .from('trip_assignments')
        .delete()
        .eq('trip_id', tripId);

      // Insert new assignments
      if (assignmentsList.length > 0) {
        const { error } = await supabase
          .from('trip_assignments')
          .insert(
            assignmentsList.map(a => ({
              trip_id: tripId,
              member_id: a.member_id,
              room_number: a.room_number || null,
              bus_seat_number: a.bus_seat_number || null,
              train_seat_number: a.train_seat_number || null,
              pnr_number: a.pnr_number || null,
              flight_ticket_number: a.flight_ticket_number || null,
              additional_notes: a.additional_notes || null
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-assignments', tripId] });
      toast({
        title: "Success",
        description: "Trip logistics saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save trip logistics",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (isLoading) {
    return <div>Loading registrations...</div>;
  }

  if (!registrations || registrations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No confirmed registrations yet. Members need to register for this trip first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Trip Logistics & Assignments
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Assign rooms, seats, and travel details to registered members
            </p>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Member</TableHead>
                <TableHead className="w-[120px]">
                  <div className="flex items-center gap-1">
                    <Hotel className="h-4 w-4" />
                    Room
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">
                  <div className="flex items-center gap-1">
                    <Bus className="h-4 w-4" />
                    Bus Seat
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">
                  <div className="flex items-center gap-1">
                    <Train className="h-4 w-4" />
                    Train Seat
                  </div>
                </TableHead>
                <TableHead className="w-[150px]">PNR Number</TableHead>
                <TableHead className="w-[150px]">Flight Ticket</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((registration) => {
                const member = registration.members;
                const assignment = assignments[member.id] || {
                  member_id: member.id,
                  room_number: '',
                  bus_seat_number: '',
                  train_seat_number: '',
                  pnr_number: '',
                  flight_ticket_number: '',
                  additional_notes: ''
                };

                return (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.membership_type} " {member.id}
                        </p>
                        <Badge
                          variant={registration.payment_status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs mt-1"
                        >
                          {registration.payment_status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="101"
                        value={assignment.room_number}
                        onChange={(e) => updateAssignment(member.id, 'room_number', e.target.value)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="A12"
                        value={assignment.bus_seat_number}
                        onChange={(e) => updateAssignment(member.id, 'bus_seat_number', e.target.value)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="S1-45"
                        value={assignment.train_seat_number}
                        onChange={(e) => updateAssignment(member.id, 'train_seat_number', e.target.value)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="1234567890"
                        value={assignment.pnr_number}
                        onChange={(e) => updateAssignment(member.id, 'pnr_number', e.target.value)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="ABC123"
                        value={assignment.flight_ticket_number}
                        onChange={(e) => updateAssignment(member.id, 'flight_ticket_number', e.target.value)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        placeholder="Additional notes..."
                        value={assignment.additional_notes}
                        onChange={(e) => updateAssignment(member.id, 'additional_notes', e.target.value)}
                        className="min-h-[60px]"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>{registrations.length}</strong> members registered "{' '}
            <strong>{Object.keys(assignments).filter(k => {
              const a = assignments[k];
              return a.room_number || a.bus_seat_number || a.train_seat_number;
            }).length}</strong> with assignments
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
