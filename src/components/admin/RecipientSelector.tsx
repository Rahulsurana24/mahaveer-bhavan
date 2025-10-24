import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, Filter, ChevronDown, MapPin } from 'lucide-react';

export interface RecipientFilter {
  type: 'all' | 'membership_type' | 'event_registration' | 'trip_registration' | 'custom';
  membershipType?: string;
  eventId?: string;
  tripId?: string;
  activityStatus?: string[];
  cities?: string[];
  states?: string[];
  registrationDateFrom?: string;
  registrationDateTo?: string;
  customFilter?: Record<string, any>;
}

interface RecipientSelectorProps {
  value: RecipientFilter;
  onChange: (filter: RecipientFilter) => void;
  onCountChange?: (count: number) => void;
}

export function RecipientSelector({ value, onChange, onCountChange }: RecipientSelectorProps) {
  const [recipientCount, setRecipientCount] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Advanced filter states
  const [activityStatus, setActivityStatus] = useState<string[]>(['active']);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch membership type counts
  const { data: membershipCounts } = useQuery({
    queryKey: ['membership-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('membership_type, status')
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

  // Fetch unique cities
  const { data: cities } = useQuery({
    queryKey: ['member-cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('city')
        .not('city', 'is', null)
        .eq('status', 'active');

      if (error) throw error;

      const uniqueCities = [...new Set(data.map(m => m.city).filter(Boolean))];
      return uniqueCities.sort();
    }
  });

  // Fetch unique states
  const { data: states } = useQuery({
    queryKey: ['member-states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('state')
        .not('state', 'is', null)
        .eq('status', 'active');

      if (error) throw error;

      const uniqueStates = [...new Set(data.map(m => m.state).filter(Boolean))];
      return uniqueStates.sort();
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
            let allQuery = supabase
              .from('members')
              .select('*', { count: 'exact', head: true });

            // Apply activity status filter
            if (activityStatus.length > 0 && activityStatus.length < 3) {
              allQuery = allQuery.in('status', activityStatus);
            }

            // Apply location filters
            if (selectedCities.length > 0) {
              allQuery = allQuery.in('city', selectedCities);
            }
            if (selectedStates.length > 0) {
              allQuery = allQuery.in('state', selectedStates);
            }

            // Apply date range filter
            if (dateFrom) {
              allQuery = allQuery.gte('date_registered', dateFrom);
            }
            if (dateTo) {
              allQuery = allQuery.lte('date_registered', dateTo);
            }

            const { count: allCount, error: allError } = await allQuery;
            if (allError) throw allError;
            count = allCount || 0;
            break;

          case 'membership_type':
            if (value.membershipType) {
              let typeQuery = supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('membership_type', value.membershipType);

              // Apply activity status filter
              if (activityStatus.length > 0 && activityStatus.length < 3) {
                typeQuery = typeQuery.in('status', activityStatus);
              }

              const { count: typeCount, error: typeError } = await typeQuery;
              if (typeError) throw typeError;
              count = typeCount || 0;
            }
            break;

          case 'event_registration':
            if (value.eventId) {
              const { count: eventCount, error: eventError } = await supabase
                .from('event_registrations')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', value.eventId)
                .eq('status', 'confirmed');
              if (eventError) throw eventError;
              count = eventCount || 0;
            }
            break;

          case 'trip_registration':
            if (value.tripId) {
              const { count: tripCount, error: tripError } = await supabase
                .from('trip_registrations')
                .select('*', { count: 'exact', head: true })
                .eq('trip_id', value.tripId)
                .eq('status', 'confirmed');
              if (tripError) throw tripError;
              count = tripCount || 0;
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
  }, [value, activityStatus, selectedCities, selectedStates, dateFrom, dateTo, onCountChange]);

  const handleFilterTypeChange = (type: RecipientFilter['type']) => {
    onChange({
      type,
      membershipType: undefined,
      eventId: undefined,
      tripId: undefined,
      activityStatus,
      cities: selectedCities,
      states: selectedStates,
      registrationDateFrom: dateFrom,
      registrationDateTo: dateTo,
      customFilter: undefined
    });
  };

  const handleActivityStatusToggle = (status: string) => {
    const newStatus = activityStatus.includes(status)
      ? activityStatus.filter(s => s !== status)
      : [...activityStatus, status];
    setActivityStatus(newStatus);

    onChange({
      ...value,
      activityStatus: newStatus
    });
  };

  const handleCityToggle = (city: string) => {
    const newCities = selectedCities.includes(city)
      ? selectedCities.filter(c => c !== city)
      : [...selectedCities, city];
    setSelectedCities(newCities);

    onChange({
      ...value,
      cities: newCities
    });
  };

  const handleApplyDateFilter = () => {
    onChange({
      ...value,
      registrationDateFrom: dateFrom,
      registrationDateTo: dateTo
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
                      onValueChange={(membershipType) => onChange({ ...value, membershipType })}
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
                      onValueChange={(eventId) => onChange({ ...value, eventId })}
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
                      onValueChange={(tripId) => onChange({ ...value, tripId })}
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

        {/* Advanced Filters */}
        <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Activity Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Activity Status</Label>
              <div className="flex flex-wrap gap-3">
                {['active', 'pending', 'inactive'].map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={activityStatus.includes(status)}
                      onCheckedChange={() => handleActivityStatusToggle(status)}
                    />
                    <Label htmlFor={`status-${status}`} className="capitalize cursor-pointer text-sm">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Location Filters */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Filters
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city-filter" className="text-xs">City</Label>
                  <Select
                    value={selectedCities[0] || ""}
                    onValueChange={(city) => {
                      if (city && !selectedCities.includes(city)) {
                        handleCityToggle(city);
                      }
                    }}
                  >
                    <SelectTrigger id="city-filter" className="text-sm">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities?.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedCities.map((city) => (
                        <Badge
                          key={city}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => handleCityToggle(city)}
                        >
                          {city} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state-filter" className="text-xs">State</Label>
                  <Select
                    value={selectedStates[0] || ""}
                    onValueChange={(state) => {
                      if (state && !selectedStates.includes(state)) {
                        const newStates = [...selectedStates, state];
                        setSelectedStates(newStates);
                        onChange({ ...value, states: newStates });
                      }
                    }}
                  >
                    <SelectTrigger id="state-filter" className="text-sm">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states?.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStates.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedStates.map((state) => (
                        <Badge
                          key={state}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => {
                            const newStates = selectedStates.filter(s => s !== state);
                            setSelectedStates(newStates);
                            onChange({ ...value, states: newStates });
                          }}
                        >
                          {state} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Registration Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="date-from" className="text-xs">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date-to" className="text-xs">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleApplyDateFilter}
                  className="w-full text-xs"
                >
                  Apply Date Filter
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {recipientCount === 0 && value.type !== 'all' && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            Please select a filter option to see recipient count
          </div>
        )}
      </CardContent>
    </Card>
  );
}
