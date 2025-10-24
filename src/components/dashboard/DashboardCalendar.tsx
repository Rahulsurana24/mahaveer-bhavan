import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location?: string;
  event_type?: string;
}

const DashboardCalendar = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch events for current month
  const { data: events } = useQuery({
    queryKey: ['calendar-events', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('start_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as Event[];
    }
  });

  // Get days in current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events?.filter(event =>
      isSameDay(parseISO(event.start_date), day)
    ) || [];
  };

  // Get upcoming events (next 5)
  const upcomingEvents = events?.filter(event =>
    new Date(event.start_date) >= new Date()
  ).slice(0, 5) || [];

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Calendar
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/calendar')}
            className="text-primary hover:text-primary/90"
          >
            View All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-base">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {daysInMonth.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;
            const isCurrentDay = isToday(day);

            return (
              <button
                key={index}
                onClick={() => navigate('/calendar')}
                className={cn(
                  "relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors",
                  "hover:bg-gray-100 active:bg-gray-200",
                  isCurrentDay && "bg-primary text-white hover:bg-primary/90",
                  !isCurrentDay && "text-gray-900"
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  isCurrentDay && "text-white"
                )}>
                  {format(day, 'd')}
                </span>
                {hasEvents && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isCurrentDay ? "bg-white" : "bg-primary"
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Upcoming Events List */}
        {upcomingEvents.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Upcoming Events
            </h4>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => navigate('/events')}
                  className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="text-xs font-medium text-gray-500">
                      {format(parseISO(event.start_date), 'MMM')}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {format(parseISO(event.start_date), 'd')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-gray-900 truncate">
                      {event.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {format(parseISO(event.start_date), 'h:mm a')}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">
                          {event.location}
                        </span>
                      </div>
                    )}
                  </div>
                  {event.event_type && (
                    <Badge variant="secondary" className="flex-shrink-0 text-xs">
                      {event.event_type}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!events || events.length === 0) && (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No events this month</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardCalendar;
