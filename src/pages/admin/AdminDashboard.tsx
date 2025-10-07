import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, MessageSquare, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeEvents: 0,
    monthlyDonations: 0,
    messagesSent: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total members
      const { count: membersCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      // Fetch active events
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .gte('date', new Date().toISOString());

      // Fetch monthly donations
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: donations } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', startOfMonth.toISOString());

      const totalDonations = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      // Fetch messages count
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Fetch upcoming events with registration counts
      const { data: events } = await supabase
        .from('events')
        .select(`
          *,
          event_registrations(count)
        `)
        .eq('is_published', true)
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(3);

      setStats({
        totalMembers: membersCount || 0,
        activeEvents: eventsCount || 0,
        monthlyDonations: totalDonations,
        messagesSent: messagesCount || 0,
      });

      setUpcomingEvents(events || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </AdminLayout>
    );
  }

  const statsData = [
    { title: "Total Members", value: stats.totalMembers.toString(), icon: Users },
    { title: "Active Events", value: stats.activeEvents.toString(), icon: Calendar },
    { title: "Monthly Donations", value: `₹${stats.monthlyDonations.toLocaleString('en-IN')}`, icon: DollarSign },
    { title: "Messages Sent", value: stats.messagesSent.toString(), icon: MessageSquare },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/events'}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.date), 'MMM dd, yyyy')} at {event.time}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {event.event_registrations?.[0]?.count || 0} registered
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Members</span>
                  <span className="font-bold">{stats.totalMembers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Month's Donations</span>
                  <span className="font-bold">₹{stats.monthlyDonations.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Published Events</span>
                  <span className="font-bold">{stats.activeEvents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Messages This Month</span>
                  <span className="font-bold">{stats.messagesSent}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => window.location.href = '/admin/members'}
              >
                <Users className="h-6 w-6 mb-2" />
                Manage Members
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => window.location.href = '/admin/events'}
              >
                <Calendar className="h-6 w-6 mb-2" />
                Manage Events
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => window.location.href = '/admin/communications'}
              >
                <MessageSquare className="h-6 w-6 mb-2" />
                Communications
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col"
                onClick={() => window.location.href = '/admin/finances'}
              >
                <DollarSign className="h-6 w-6 mb-2" />
                View Donations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;