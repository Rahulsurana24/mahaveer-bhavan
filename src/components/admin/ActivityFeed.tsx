import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, DollarSign, Calendar, Settings, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: 'member_registration' | 'donation' | 'event_created' | 'trip_created' | 'system_update';
  actor: string;
  details?: string;
  timestamp: string;
}

export function ActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      const activities: ActivityItem[] = [];

      // Fetch recent member registrations
      const { data: members } = await supabase
        .from('members')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      members?.forEach(member => {
        activities.push({
          id: `member-${member.id}`,
          type: 'member_registration',
          actor: member.full_name,
          details: member.id,
          timestamp: member.created_at
        });
      });

      // Fetch recent donations
      const { data: donations } = await supabase
        .from('donations')
        .select('id, amount, created_at, member_id, members(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      donations?.forEach(donation => {
        activities.push({
          id: `donation-${donation.id}`,
          type: 'donation',
          actor: donation.members?.full_name || 'Anonymous',
          details: `₹${donation.amount.toLocaleString('en-IN')}`,
          timestamp: donation.created_at
        });
      });

      // Fetch recent events
      const { data: events } = await supabase
        .from('events')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      events?.forEach(event => {
        activities.push({
          id: `event-${event.id}`,
          type: 'event_created',
          actor: 'Admin',
          details: event.title,
          timestamp: event.created_at
        });
      });

      // Fetch recent trips
      const { data: trips } = await supabase
        .from('trips')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      trips?.forEach(trip => {
        activities.push({
          id: `trip-${trip.id}`,
          type: 'trip_created',
          actor: 'Admin',
          details: trip.title,
          timestamp: trip.created_at
        });
      });

      // Sort all activities by timestamp
      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 10);
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'member_registration':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'donation':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'event_created':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'trip_created':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'member_registration':
        return (
          <>
            <span className="font-medium">{activity.actor}</span> registered as new member{' '}
            {activity.details && <Badge variant="outline" className="text-xs">{activity.details}</Badge>}
          </>
        );
      case 'donation':
        return (
          <>
            <span className="font-medium">{activity.actor}</span> donated{' '}
            <span className="font-semibold text-green-500">{activity.details}</span>
          </>
        );
      case 'event_created':
        return (
          <>
            <span className="font-medium">{activity.actor}</span> created event{' '}
            <span className="font-medium">{activity.details}</span>
          </>
        );
      case 'trip_created':
        return (
          <>
            <span className="font-medium">{activity.actor}</span> created trip{' '}
            <span className="font-medium">{activity.details}</span>
          </>
        );
      default:
        return <span>{activity.actor} performed an action</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading activities...</p>
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      {getIcon(activity.type)}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm leading-tight">
                      {getActionText(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
