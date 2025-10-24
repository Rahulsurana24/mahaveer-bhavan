import { useState } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Sunrise,
  Sunset,
  X,
  PartyPopper,
  Plane,
  Sparkles,
  AlertCircle,
  Bell,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  calculateDefaultStatus,
  fetchSunTimes,
  mergeActivitiesForDate,
  getActivityColor,
  getActivityIcon,
  type CalendarEntry,
  type Festival,
  type DayActivity,
} from '@/lib/calendar-utils';
import { Loading } from '@/components/ui/loading';

const EnhancedMobileCalendarManagement = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<DayActivity[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [isCustomEventDialogOpen, setIsCustomEventDialogOpen] = useState(false);
  const [isFestivalDialogOpen, setIsFestivalDialogOpen] = useState(false);

  // Form states
  const [overrideType, setOverrideType] = useState<'upass' | 'biyashna'>('upass');
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayReason, setHolidayReason] = useState('');
  const [customEventTitle, setCustomEventTitle] = useState('');
  const [customEventDescription, setCustomEventDescription] = useState('');
  const [festivalName, setFestivalName] = useState('');
  const [festivalDescription, setFestivalDescription] = useState('');
  const [festivalDate, setFestivalDate] = useState('');
  const [festivalRecurring, setFestivalRecurring] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch calendar entries for the month
  const { data: calendarEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['calendar-entries', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('calendar_entries')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      if (error) throw error;
      return data as CalendarEntry[];
    },
  });

  // Fetch events for the month
  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('is_published', true);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch trips for the month
  const { data: trips = [] } = useQuery({
    queryKey: ['calendar-trips', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .or(
          `start_date.lte.${format(monthEnd, 'yyyy-MM-dd')},end_date.gte.${format(
            monthStart,
            'yyyy-MM-dd'
          )}`
        )
        .eq('is_published', true);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch festivals
  const { data: festivals = [] } = useQuery({
    queryKey: ['festivals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('festivals')
        .select('*')
        .eq('is_active', true)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as Festival[];
    },
  });

  // Override Upass/Biyashna mutation
  const overrideMutation = useMutation({
    mutationFn: async (data: {
      date: string;
      type: 'upass' | 'biyashna';
      sunTimes: { sunrise: string; sunset: string };
    }) => {
      const { error } = await supabase.from('calendar_entries').upsert(
        {
          date: data.date,
          entry_type: data.type,
          is_manual_override: true,
          sunrise_time: data.sunTimes.sunrise,
          sunset_time: data.sunTimes.sunset,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
        { onConflict: 'date' }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-entries'] });
      toast({ title: '✓ Schedule Updated' });
      setIsOverrideDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Mark holiday mutation (triggers notification)
  const markHolidayMutation = useMutation({
    mutationFn: async (data: { date: string; title: string; reason: string }) => {
      const { error } = await supabase.from('calendar_entries').upsert(
        {
          date: data.date,
          entry_type: 'holiday',
          title: data.title,
          reason: data.reason,
          is_manual_override: true,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
        { onConflict: 'date' }
      );

      if (error) throw error;

      // Notification will be triggered automatically by database trigger
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-entries'] });
      toast({
        title: '✓ Holiday Marked',
        description: 'Notification queued for Tapasvi and Karyakarta members',
      });
      setIsHolidayDialogOpen(false);
      setHolidayTitle('');
      setHolidayReason('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Add custom event mutation
  const addCustomEventMutation = useMutation({
    mutationFn: async (data: { date: string; title: string; description: string }) => {
      const sunTimes = await fetchSunTimes(new Date(data.date));
      const { error } = await supabase.from('calendar_entries').insert({
        date: data.date,
        entry_type: 'custom_event',
        title: data.title,
        description: data.description,
        sunrise_time: sunTimes.sunrise,
        sunset_time: sunTimes.sunset,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-entries'] });
      toast({ title: '✓ Custom Event Added' });
      setIsCustomEventDialogOpen(false);
      setCustomEventTitle('');
      setCustomEventDescription('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Add festival mutation
  const addFestivalMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      date: string;
      description: string;
      recurring: boolean;
    }) => {
      const { error } = await supabase.from('festivals').insert({
        name: data.name,
        date: data.date,
        description: data.description,
        is_recurring: data.recurring,
        recurrence_pattern: data.recurring ? 'annual' : null,
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['festivals'] });
      toast({ title: '✓ Festival Added' });
      setIsFestivalDialogOpen(false);
      setFestivalName('');
      setFestivalDescription('');
      setFestivalDate('');
      setFestivalRecurring(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get activities for a specific date
  const getActivitiesForDate = (day: Date): DayActivity[] => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const entry = calendarEntries.find((e) => e.date === dateStr);
    return mergeActivitiesForDate(day, entry || null, events, trips, festivals);
  };

  // Handle date click
  const handleDateClick = async (day: Date) => {
    const activities = getActivitiesForDate(day);
    setSelectedDate(day);
    setSelectedActivities(activities);
    setIsDetailsOpen(true);
  };

  // Handle override
  const handleOverride = async () => {
    if (!selectedDate) return;

    const sunTimes = await fetchSunTimes(selectedDate);
    overrideMutation.mutate({
      date: format(selectedDate, 'yyyy-MM-dd'),
      type: overrideType,
      sunTimes,
    });
  };

  // Handle mark holiday
  const handleMarkHoliday = () => {
    if (!selectedDate) return;

    if (!holidayTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter holiday title', variant: 'destructive' });
      return;
    }

    markHolidayMutation.mutate({
      date: format(selectedDate, 'yyyy-MM-dd'),
      title: holidayTitle,
      reason: holidayReason,
    });
  };

  // Handle add custom event
  const handleAddCustomEvent = () => {
    if (!selectedDate) return;

    if (!customEventTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter event title', variant: 'destructive' });
      return;
    }

    addCustomEventMutation.mutate({
      date: format(selectedDate, 'yyyy-MM-dd'),
      title: customEventTitle,
      description: customEventDescription,
    });
  };

  // Handle add festival
  const handleAddFestival = () => {
    if (!festivalName.trim() || !festivalDate) {
      toast({
        title: 'Validation Error',
        description: 'Please enter festival name and date',
        variant: 'destructive',
      });
      return;
    }

    addFestivalMutation.mutate({
      name: festivalName,
      date: festivalDate,
      description: festivalDescription,
      recurring: festivalRecurring,
    });
  };

  // Get activity icons
  const getIcon = (type: DayActivity['type']) => {
    switch (type) {
      case 'holiday':
        return <X className="h-3 w-3" />;
      case 'event':
        return <PartyPopper className="h-3 w-3" />;
      case 'trip':
        return <Plane className="h-3 w-3" />;
      case 'festival':
        return <Sparkles className="h-3 w-3" />;
      case 'custom_event':
        return <Plus className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  if (entriesLoading) {
    return (
      <MobileLayout title="Calendar Management">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Calendar Management">
      <div className="px-4 py-4 space-y-4">
        {/* Month Navigation */}
        <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="text-center">
                <div className="text-lg font-bold text-white">
                  {format(currentDate, 'MMMM yyyy')}
                </div>
                <div className="text-xs text-gray-400">
                  Tap a date to view or manage activities
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="text-white hover:bg-white/10"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => setIsFestivalDialogOpen(true)}
            size="sm"
            variant="outline"
            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Add Festival
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
          <CardContent className="p-3">
            {/* Week Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayActivities = getActivitiesForDate(day);
                const hasActivities = dayActivities.length > 0;
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                const hasHoliday = dayActivities.some((a) => a.type === 'holiday');

                return (
                  <motion.button
                    key={day.toISOString()}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.01 }}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'aspect-square rounded-lg relative p-1 flex flex-col items-center justify-center',
                      isCurrentMonth ? 'text-white' : 'text-gray-600',
                      isTodayDate && 'ring-2 ring-[#00A36C]',
                      hasHoliday
                        ? 'bg-red-500/20 border border-red-500/30'
                        : hasActivities
                        ? 'bg-gradient-to-br from-[#00A36C]/20 to-[#B8860B]/20 border border-[#00A36C]/30'
                        : 'bg-white/5 hover:bg-white/10'
                    )}
                  >
                    <span className={cn('text-xs font-medium', isTodayDate && 'font-bold')}>
                      {format(day, 'd')}
                    </span>

                    {/* Activity Indicators */}
                    {hasActivities && (
                      <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                        {dayActivities.slice(0, 3).map((activity, idx) => (
                          <div
                            key={idx}
                            className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: getActivityColor(activity.type) }}
                          />
                        ))}
                      </div>
                    )}

                    {dayActivities.length > 3 && (
                      <Badge className="absolute bottom-0.5 right-0.5 h-3 text-[8px] bg-[#00A36C] border-0 px-1">
                        {dayActivities.length}
                      </Badge>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00A36C]" />
                <span className="text-gray-300">Upass</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#B8860B]" />
                <span className="text-gray-300">Biyashna</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-300">Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-300">Event</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-300">Trip</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-gray-300">Festival</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedDate && format(selectedDate, 'EEEE')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Show Sunset/Sunrise for Upass/Biyashna days */}
            {selectedActivities.some((a) => a.type === 'upass' || a.type === 'biyashna') &&
              selectedActivities[0]?.sunTimes && (
                <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                  <CardContent className="p-3">
                    <div className="flex justify-around text-sm">
                      <div className="flex items-center gap-2">
                        <Sunrise className="h-4 w-4 text-orange-400" />
                        <div>
                          <div className="text-gray-400 text-xs">Sunrise</div>
                          <div className="text-white font-semibold">
                            {selectedActivities[0].sunTimes.sunrise}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sunset className="h-4 w-4 text-orange-600" />
                        <div>
                          <div className="text-gray-400 text-xs">Sunset</div>
                          <div className="text-white font-semibold">
                            {selectedActivities[0].sunTimes.sunset}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Activities List */}
            <div className="space-y-2">
              {selectedActivities.map((activity, idx) => (
                <Card
                  key={idx}
                  className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${getActivityColor(activity.type)}20` }}
                      >
                        <div style={{ color: getActivityColor(activity.type) }}>
                          {getIcon(activity.type)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{activity.title}</h4>
                          {activity.isDefault && (
                            <Badge className="h-4 text-[10px] bg-white/10 text-gray-400 border-0">
                              Default
                            </Badge>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-xs text-gray-400 mt-1">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Admin Actions */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <Label className="text-gray-300 text-xs">Admin Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    setIsOverrideDialogOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Override
                </Button>
                <Button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    setIsHolidayDialogOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Holiday
                </Button>
                <Button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    setIsCustomEventDialogOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="col-span-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Event
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent className="max-w-[95vw] bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Override Schedule</DialogTitle>
            <DialogDescription className="text-gray-400">
              Manually set Upass or Biyashna for {selectedDate && format(selectedDate, 'MMM dd')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Select Type</Label>
              <Select value={overrideType} onValueChange={(v: any) => setOverrideType(v)}>
                <SelectTrigger className="bg-[#252525] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#252525] border-white/10">
                  <SelectItem value="upass">Upass</SelectItem>
                  <SelectItem value="biyashna">Biyashna</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                Manual overrides are permanent and won't be affected by automatic rule recalculation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOverrideDialogOpen(false)}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleOverride}
              disabled={overrideMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {overrideMutation.isPending ? 'Saving...' : 'Save Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Holiday Dialog */}
      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent className="max-w-[95vw] bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Mark as Holiday</DialogTitle>
            <DialogDescription className="text-gray-400">
              Mark {selectedDate && format(selectedDate, 'MMM dd')} as holiday/closed day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Holiday Title *</Label>
              <Input
                placeholder="e.g., Mahaveer Jayanti"
                value={holidayTitle}
                onChange={(e) => setHolidayTitle(e.target.value)}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Reason (Optional)</Label>
              <Textarea
                placeholder="Additional details..."
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                className="bg-[#252525] border-white/10 text-white resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Bell className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                A notification will be sent to all Tapasvi and Karyakarta members about this closure.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsHolidayDialogOpen(false)}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkHoliday}
              disabled={markHolidayMutation.isPending}
              className="bg-red-500 hover:bg-red-500/90"
            >
              {markHolidayMutation.isPending ? 'Marking...' : 'Mark Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Event Dialog */}
      <Dialog open={isCustomEventDialogOpen} onOpenChange={setIsCustomEventDialogOpen}>
        <DialogContent className="max-w-[95vw] bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Custom Event</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a simple event for {selectedDate && format(selectedDate, 'MMM dd')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Event Title *</Label>
              <Input
                placeholder="e.g., Special Lecture"
                value={customEventTitle}
                onChange={(e) => setCustomEventTitle(e.target.value)}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Description (Optional)</Label>
              <Textarea
                placeholder="Event details..."
                value={customEventDescription}
                onChange={(e) => setCustomEventDescription(e.target.value)}
                className="bg-[#252525] border-white/10 text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCustomEventDialogOpen(false)}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomEvent}
              disabled={addCustomEventMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {addCustomEventMutation.isPending ? 'Adding...' : 'Add Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Festival Dialog */}
      <Dialog open={isFestivalDialogOpen} onOpenChange={setIsFestivalDialogOpen}>
        <DialogContent className="max-w-[95vw] bg-[#1C1C1C] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Festival</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a festival to the calendar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Festival Name *</Label>
              <Input
                placeholder="e.g., Paryushana"
                value={festivalName}
                onChange={(e) => setFestivalName(e.target.value)}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Date *</Label>
              <Input
                type="date"
                value={festivalDate}
                onChange={(e) => setFestivalDate(e.target.value)}
                className="bg-[#252525] border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Description (Optional)</Label>
              <Textarea
                placeholder="Festival details..."
                value={festivalDescription}
                onChange={(e) => setFestivalDescription(e.target.value)}
                className="bg-[#252525] border-white/10 text-white resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={festivalRecurring}
                onChange={(e) => setFestivalRecurring(e.target.checked)}
                className="w-4 h-4 rounded bg-[#252525] border-white/10"
              />
              <Label htmlFor="recurring" className="text-gray-300 text-sm">
                Recurring festival (appears every year)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFestivalDialogOpen(false)}
              className="bg-[#252525] border-white/10 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFestival}
              disabled={addFestivalMutation.isPending}
              className="bg-[#00A36C] hover:bg-[#00A36C]/90"
            >
              {addFestivalMutation.isPending ? 'Adding...' : 'Add Festival'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default EnhancedMobileCalendarManagement;
