import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, Filter } from 'lucide-react';

export interface RecipientFilter {
  type: 'all' | 'membership_type' | 'event_registration' | 'trip_registration' | 'custom';
  membershipType?: string;
  eventId?: string;
  tripId?: string;
  customFilter?: Record<string, any>;
}

interface RecipientSelectorProps {
  value: RecipientFilter;
  onChange: (filter: RecipientFilter) => void;
  onCountChange?: (count: number) => void;
}

export function RecipientSelector({ value, onChange, onCountChange }: RecipientSelectorProps) {
  const [recipientCount, setRecipientCount] = useState(0);

  // Fetch membership type counts
  const { data: membershipCounts } = useQuery({
    queryKey: ['membership-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('membership_type')
        .eq('status', 'active');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((member) => {
        counts[member.membership_type] = (counts[member.membership_type] || 0) + 1;
      });

      return {
        total: data.length,
        byType: counts
      };
    }
  });

  // Fetch events for filtering
  const { data: events } = useQuery({
    queryKey: ['events-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data;
    }
  });

  // Fetch trips for filtering
  const { data: trips } = useQuery({
    queryKey: ['trips-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title')
        .gte('start_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data;
    }
  });

  // Calculate recipient count based on filter
  useEffect(() => {
    const calculateCount = async () => {
      try {
        let count = 0;

        switch (value.type) {
          case 'all':
            const { data: allMembers } = await supabase
              .from('members')
              .select('id', { count: 'exact', head: true })
              .eq('status', 'active');
            count = allMembers ? (allMembers as any).count || 0 : 0;
            break;

          case 'membership_type':
            if (value.membershipType) {
              const { data: typeMembers } = await supabase
                .from('members')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active')
                .eq('membership_type', value.membershipType);
              count = typeMembers ? (typeMembers as any).count || 0 : 0;
            }
            break;

          case 'event_registration':
            if (value.eventId) {
              const { data: eventRegistrations } = await supabase
                .from('event_registrations')
                .select('member_id', { count: 'exact', head: true })
                .eq('event_id', value.eventId)
                .eq('status', 'confirmed');
              count = eventRegistrations ? (eventRegistrations as any).count || 0 : 0;
            }
            break;

          case 'trip_registration':
            if (value.tripId) {
              const { data: tripRegistrations } = await supabase
                .from('trip_registrations')
                .select('member_id', { count: 'exact', head: true })
                .eq('trip_id', value.tripId)
                .eq('status', 'confirmed');
              count = tripRegistrations ? (tripRegistrations as any).count || 0 : 0;
            }
            break;

          default:
            count = 0;
        }

        setRecipientCount(count);
        if (onCountChange) {
          onCountChange(count);
        }
      } catch (error) {
        console.error('Error calculating recipient count:', error);
        setRecipientCount(0);
        if (onCountChange) {
          onCountChange(0);
        }
      }
    };

    calculateCount();
  }, [value, onCountChange]);

  const handleFilterTypeChange = (type: RecipientFilter['type']) => {
    onChange({
      type,
      membershipType: undefined,
      eventId: undefined,
      tripId: undefined,
      customFilter: undefined
    });
  };

  const handleMembershipTypeChange = (membershipType: string) => {
    onChange({
      ...value,
      membershipType
    });
  };

  const handleEventChange = (eventId: string) => {
    onChange({
      ...value,
      eventId
    });
  };

  const handleTripChange = (tripId: string) => {
    onChange({
      ...value,
      tripId
    });
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Select Recipients</Label>
          <Badge variant="secondary" className="text-sm">
            <Users className="h-3 w-3 mr-1" />
            {recipientCount} recipients
          </Badge>
        </div>

        <RadioGroup value={value.type} onValueChange={handleFilterTypeChange}>
          <div className="space-y-3">
            {/* All Members */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="all" id="filter-all" />
              <Label htmlFor="filter-all" className="flex items-center gap-2 cursor-pointer flex-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">All Members</div>
                  <div className="text-sm text-muted-foreground">
                    {membershipCounts?.total || 0} active members
                  </div>
                </div>
              </Label>
            </div>

            {/* By Membership Type */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="membership_type" id="filter-membership" />
              <Label htmlFor="filter-membership" className="flex items-center gap-2 cursor-pointer flex-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">By Membership Type</div>
                  {value.type === 'membership_type' && (
                    <Select
                      value={value.membershipType || ""}
                      onValueChange={handleMembershipTypeChange}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select membership type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Karyakarta">
                          Karyakarta ({membershipCounts?.byType['Karyakarta'] || 0})
                        </SelectItem>
                        <SelectItem value="Tapasvi">
                          Tapasvi ({membershipCounts?.byType['Tapasvi'] || 0})
                        </SelectItem>
                        <SelectItem value="Labharti">
                          Labharti ({membershipCounts?.byType['Labharti'] || 0})
                        </SelectItem>
                        <SelectItem value="Trustee">
                          Trustee ({membershipCounts?.byType['Trustee'] || 0})
                        </SelectItem>
                        <SelectItem value="Extra">
                          Extra ({membershipCounts?.byType['Extra'] || 0})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </Label>
            </div>

            {/* By Event Registration */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="event_registration" id="filter-event" />
              <Label htmlFor="filter-event" className="flex items-center gap-2 cursor-pointer flex-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">By Event Registration</div>
                  {value.type === 'event_registration' && (
                    <Select
                      value={value.eventId || ""}
                      onValueChange={handleEventChange}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events?.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </Label>
            </div>

            {/* By Trip Registration */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="trip_registration" id="filter-trip" />
              <Label htmlFor="filter-trip" className="flex items-center gap-2 cursor-pointer flex-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">By Trip Registration</div>
                  {value.type === 'trip_registration' && (
                    <Select
                      value={value.tripId || ""}
                      onValueChange={handleTripChange}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select trip" />
                      </SelectTrigger>
                      <SelectContent>
                        {trips?.map((trip) => (
                          <SelectItem key={trip.id} value={trip.id}>
                            {trip.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>

        {recipientCount === 0 && value.type !== 'all' && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Please select a filter option to see recipient count
          </div>
        )}
      </CardContent>
    </Card>
  );
}
