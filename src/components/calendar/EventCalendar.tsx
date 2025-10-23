import { useState } from 'react';
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Plus, Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  end_date: string | null;
  color: string;
  is_holiday: boolean;
  visible_to_members: boolean;
}

interface EventCalendarProps {
  isAdmin?: boolean;
}

export function EventCalendar({ isAdmin = false }: EventCalendarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'custom',
    event_date: '',
    end_date: '',
    color: '#10b981',
    is_holiday: false,
    visible_to_members: true
  });

  // Fetch calendar events
  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      let query = supabase.from('calendar_events').select('*');

      if (!isAdmin) {
        query = query.eq('visible_to_members', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CalendarEvent[];
    }
  });

  // Transform events for calendar
  const calendarEvents = events?.map((event) => ({
    id: event.id,
    title: event.title,
    start: new Date(event.event_date),
    end: event.end_date ? new Date(event.end_date) : new Date(event.event_date),
    resource: event,
    style: {
      backgroundColor: event.color,
      borderColor: event.color
    }
  })) || [];

  // Create event mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          ...data,
          created_by: userData.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Success',
        description: 'Event added to calendar',
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create calendar event',
        variant: 'destructive',
      });
    }
  });

  // Update event mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('calendar_events')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });
      setIsEditOpen(false);
      setSelectedEvent(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    }
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
      setIsEditOpen(false);
      setSelectedEvent(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'custom',
      event_date: '',
      end_date: '',
      color: '#10b981',
      is_holiday: false,
      visible_to_members: true
    });
  };

  const handleSelectEvent = (event: any) => {
    const calEvent = event.resource as CalendarEvent;
    setSelectedEvent(calEvent);
    setFormData({
      title: calEvent.title,
      description: calEvent.description || '',
      event_type: calEvent.event_type,
      event_date: calEvent.event_date,
      end_date: calEvent.end_date || '',
      color: calEvent.color,
      is_holiday: calEvent.is_holiday,
      visible_to_members: calEvent.visible_to_members
    });
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    if (!formData.title || !formData.event_date) {
      toast({
        title: 'Validation Error',
        description: 'Title and date are required',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedEvent) return;

    if (!formData.title || !formData.event_date) {
      toast({
        title: 'Validation Error',
        description: 'Title and date are required',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({ id: selectedEvent.id, data: formData });
  };

  const handleDelete = () => {
    if (!selectedEvent) return;

    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(selectedEvent.id);
    }
  };

  const eventTypeColors: Record<string, string> = {
    trip: '#3b82f6',
    event: '#10b981',
    upvas: '#8b5cf6',
    biyashna: '#f59e0b',
    holiday: '#ef4444',
    custom: '#6b7280'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Event Calendar
          </CardTitle>
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[600px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        ) : (
          <>
            <div className="h-[600px]">
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={isAdmin ? handleSelectEvent : undefined}
                eventPropGetter={(event: any) => ({
                  style: {
                    backgroundColor: event.resource.color,
                    borderColor: event.resource.color,
                    color: 'white'
                  }
                })}
              />
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="text-sm font-medium">Event Types:</div>
              {Object.entries(eventTypeColors).map(([type, color]) => (
                <Badge key={type} style={{ backgroundColor: color, color: 'white' }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Badge>
              ))}
            </div>
          </>
        )}

        {/* Create Event Dialog */}
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Calendar Event</DialogTitle>
                <DialogDescription>
                  Create a new event on the calendar
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Title *</Label>
                  <Input
                    placeholder="e.g., Monthly Satsang"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        event_type: value,
                        color: eventTypeColors[value]
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trip">Trip</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="upvas">Upvas (Fasting)</SelectItem>
                      <SelectItem value="biyashna">Biyashna</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Event details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="holiday"
                    checked={formData.is_holiday}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_holiday: checked })}
                  />
                  <Label htmlFor="holiday">Mark as Holiday</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="visible"
                    checked={formData.visible_to_members}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, visible_to_members: checked })
                    }
                  />
                  <Label htmlFor="visible">Visible to Members</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Event Dialog */}
        {isAdmin && selectedEvent && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Calendar Event</DialogTitle>
                <DialogDescription>
                  Update event details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={formData.event_type}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        event_type: value,
                        color: eventTypeColors[value]
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trip">Trip</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="upvas">Upvas (Fasting)</SelectItem>
                      <SelectItem value="biyashna">Biyashna</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-holiday"
                    checked={formData.is_holiday}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_holiday: checked })}
                  />
                  <Label htmlFor="edit-holiday">Mark as Holiday</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-visible"
                    checked={formData.visible_to_members}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, visible_to_members: checked })
                    }
                  />
                  <Label htmlFor="edit-visible">Visible to Members</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update Event'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
