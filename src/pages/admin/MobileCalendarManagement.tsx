import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
  Calendar as CalendarIcon,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Plane,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loading } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
  parseISO
} from 'date-fns';

const MobileCalendarManagement = () => {
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<any[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch events and trips
  const { data: activities, isLoading } = useQuery({
    queryKey: ['calendar-activities', currentDate, filterType],
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Fetch events
      let eventsQuery = supabase
        .from('events')
        .select('id, title, date, time, location, is_published, capacity')
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0]);

      if (filterType === 'published') {
        eventsQuery = eventsQuery.eq('is_published', true);
      } else if (filterType === 'draft') {
        eventsQuery = eventsQuery.eq('is_published', false);
      }

      const { data: events } = await eventsQuery;

      // Fetch trips
      let tripsQuery = supabase
        .from('trips')
        .select('id, title, start_date, end_date, destination, is_published, capacity')
        .gte('start_date', monthStart.toISOString().split('T')[0])
        .lte('start_date', monthEnd.toISOString().split('T')[0]);

      if (filterType === 'published') {
        tripsQuery = tripsQuery.eq('is_published', true);
      } else if (filterType === 'draft') {
        tripsQuery = tripsQuery.eq('is_published', false);
      }

      const { data: trips } = await tripsQuery;

      const combined = [
        ...(events || []).map(e => ({
          ...e,
          type: 'event' as const,
          date: parseISO(e.date)
        })),
        ...(trips || []).map(t => ({
          ...t,
          type: 'trip' as const,
          date: parseISO(t.start_date)
        }))
      ];

      return combined;
    }
  });

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getActivitiesForDate = (date: Date) => {
    return activities?.filter(activity =>
      isSameDay(activity.date, date)
    ) || [];
  };

  const handleDateClick = (date: Date) => {
    const dayActivities = getActivitiesForDate(date);
    if (dayActivities.length > 0) {
      setSelectedDate(date);
      setSelectedActivities(dayActivities);
      setIsDetailsOpen(true);
    } else {
      // Navigate to create new event/trip with pre-selected date
      navigate(`/admin/events?date=${date.toISOString().split('T')[0]}`);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleCreateNew = () => {
    navigate('/admin/events');
  };

  if (isLoading) {
    return (
      <MobileLayout title="Calendar">
        <div className="flex justify-center items-center min-h-screen bg-[#1C1C1C]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Calendar"
      headerRight={
        <Button
          size="sm"
          onClick={handleCreateNew}
          className="bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] h-9"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create
        </Button>
      }
    >
      <div className="min-h-screen bg-[#1C1C1C]">
        {/* Month Navigation & Filter */}
        <div className="sticky top-14 z-30 bg-gradient-to-b from-[#252525] to-[#1C1C1C] border-b border-white/10 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-10 w-10 text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <h2 className="text-white font-bold text-xl">
              {format(currentDate, 'MMMM yyyy')}
            </h2>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-10 w-10 text-white hover:bg-white/10"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#252525] border-white/10">
              <SelectItem value="all" className="text-white">All Activities</SelectItem>
              <SelectItem value="published" className="text-white">Published Only</SelectItem>
              <SelectItem value="draft" className="text-white">Drafts Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Calendar Grid */}
        <div className="px-4 py-6">
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 overflow-hidden">
            <CardContent className="p-4">
              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayActivities = getActivitiesForDate(day);
                  const hasActivities = dayActivities.length > 0;
                  const hasEvents = dayActivities.some(a => a.type === 'event');
                  const hasTrips = dayActivities.some(a => a.type === 'trip');
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isTodayDate = isToday(day);

                  return (
                    <motion.button
                      key={day.toISOString()}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.01 }}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "aspect-square rounded-lg relative transition-all",
                        isCurrentMonth ? "text-white" : "text-gray-600",
                        isTodayDate && "ring-2 ring-[#00A36C]",
                        hasActivities
                          ? "bg-gradient-to-br from-[#00A36C]/20 to-[#B8860B]/20 border border-[#00A36C]/30"
                          : "bg-white/5 hover:bg-white/10",
                        !isCurrentMonth && "opacity-50"
                      )}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={cn(
                          "text-sm font-medium",
                          isTodayDate && "font-bold"
                        )}>
                          {format(day, 'd')}
                        </span>

                        {hasActivities && (
                          <div className="flex gap-0.5 mt-1">
                            {hasEvents && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#00A36C]" />
                            )}
                            {hasTrips && (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
                            )}
                          </div>
                        )}

                        {dayActivities.length > 2 && (
                          <div className="absolute bottom-0.5 right-0.5">
                            <Badge className="h-4 min-w-4 px-1 bg-[#00A36C] text-[8px]">
                              {dayActivities.length}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#00A36C]" />
              <span className="text-gray-400">Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#B8860B]" />
              <span className="text-gray-400">Trips</span>
            </div>
          </div>

          {/* Upcoming Activities List */}
          <div className="mt-6">
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#B8860B]" />
              Upcoming Activities This Month
            </h3>

            {activities && activities.length > 0 ? (
              <div className="space-y-2">
                {activities
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .slice(0, 5)
                  .map((activity) => (
                    <Card
                      key={`${activity.type}-${activity.id}`}
                      className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 cursor-pointer hover:border-[#00A36C]/30 transition-all"
                      onClick={() => navigate(`/admin/${activity.type === 'event' ? 'events' : 'trips'}`)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{
                            backgroundColor: activity.type === 'event' ? '#00A36C20' : '#B8860B20'
                          }}
                        >
                          {activity.type === 'event' ? (
                            <CalendarIcon
                              className="h-5 w-5"
                              style={{ color: '#00A36C' }}
                            />
                          ) : (
                            <Plane
                              className="h-5 w-5"
                              style={{ color: '#B8860B' }}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-semibold text-sm truncate">
                              {activity.title}
                            </h4>
                            <Badge
                              className={cn(
                                "text-xs flex-shrink-0",
                                activity.is_published
                                  ? "bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/30"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              )}
                            >
                              {activity.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{format(activity.date, 'MMM d, yyyy')}</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {activity.type === 'event' ? activity.location : activity.destination}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">{activity.capacity || 'N/A'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-8 text-center">
                  <CalendarIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No activities this month</p>
                  <Button
                    onClick={handleCreateNew}
                    className="mt-4 bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Activity
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Selected Date Activities Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="bg-[#252525] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-white">
                  {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDetailsOpen(false)}
                  className="h-8 w-8 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {selectedActivities.map((activity) => (
                <Card
                  key={`${activity.type}-${activity.id}`}
                  className="bg-white/5 border-white/10 cursor-pointer hover:border-[#00A36C]/30 transition-all"
                  onClick={() => {
                    setIsDetailsOpen(false);
                    navigate(`/admin/${activity.type === 'event' ? 'events' : 'trips'}`);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{
                          backgroundColor: activity.type === 'event' ? '#00A36C20' : '#B8860B20'
                        }}
                      >
                        {activity.type === 'event' ? (
                          <CalendarIcon className="h-5 w-5" style={{ color: '#00A36C' }} />
                        ) : (
                          <Plane className="h-5 w-5" style={{ color: '#B8860B' }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-base mb-1">
                          {activity.title}
                        </h4>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            {activity.time && (
                              <span>{activity.time}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <MapPin className="h-3 w-3" />
                            <span>{activity.type === 'event' ? activity.location : activity.destination}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className={cn(
                                "text-xs",
                                activity.is_published
                                  ? "bg-[#00A36C]/20 text-[#00A36C] border-[#00A36C]/30"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              )}
                            >
                              {activity.is_published ? 'Published' : 'Draft'}
                            </Badge>

                            <Badge className="bg-[#B8860B]/20 text-[#B8860B] border-[#B8860B]/30 text-xs">
                              {activity.type === 'event' ? 'Event' : 'Trip'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={() => {
                setIsDetailsOpen(false);
                navigate(`/admin/events?date=${selectedDate?.toISOString().split('T')[0]}`);
              }}
              className="w-full bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Activity
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default MobileCalendarManagement;
