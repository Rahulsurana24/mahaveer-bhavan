import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Plane, MessageCircle, Heart, Image, Bell, User } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMemberData } from "@/hooks/useMemberData";
import { Loading } from "@/components/ui/loading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { member, loading: memberLoading } = useMemberData();
  const navigate = useNavigate();

  // Fetch upcoming events
  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString())
        .eq('is_published', true)
        .order('date', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch upcoming trips
  const { data: upcomingTrips } = useQuery({
    queryKey: ['upcoming-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .eq('status', 'open')
        .order('start_date', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications', member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('member_id', member.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!member
  });

  if (memberLoading) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" text="Loading your dashboard..." />
        </div>
      </MainLayout>
    );
  }

  const quickActions = [
    { icon: CreditCard, label: "Digital ID Card", description: "View and download", path: "/id-card", color: "text-blue-500" },
    { icon: Calendar, label: "Events", description: `${upcomingEvents?.length || 0} upcoming`, path: "/events", color: "text-green-500" },
    { icon: Plane, label: "Trips & Tours", description: `${upcomingTrips?.length || 0} available`, path: "/trips", color: "text-purple-500" },
    { icon: MessageCircle, label: "Messages", description: "Chat with members", path: "/messages", color: "text-orange-500" },
    { icon: Heart, label: "Donations", description: "Support our cause", path: "/donations", color: "text-red-500" },
    { icon: Image, label: "Gallery", description: "Photos & videos", path: "/gallery", color: "text-pink-500" },
  ];

  return (
    <MainLayout title="Dashboard">
      <div className="p-4 space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {member?.full_name || 'Member'}!
          </h1>
          <p className="text-muted-foreground">Sree Mahaveer Swami Charitable Trust</p>
          {member && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Badge variant="outline">{member.membership_type}</Badge>
              <Badge variant="secondary">ID: {member.id}</Badge>
            </div>
          )}
        </motion.div>

        {/* Notifications Alert */}
        {notifications && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Notifications</CardTitle>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => navigate('/notifications')}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.slice(0, 2).map((notif) => (
                  <div key={notif.id} className="text-sm p-2 bg-background rounded">
                    <div className="font-medium">{notif.title}</div>
                    <div className="text-muted-foreground text-xs">{notif.content}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-primary">{upcomingEvents?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Upcoming Events</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Plane className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-accent">{upcomingTrips?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Available Trips</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.label} 
                  className="cursor-pointer hover:bg-accent/50 transition-all hover:shadow-md"
                  onClick={() => navigate(action.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{action.label}</div>
                        <div className="text-sm text-muted-foreground">{action.description}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Upcoming Events Preview */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Upcoming Events</CardTitle>
                  <Button variant="link" onClick={() => navigate('/events')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/events`)}
                  >
                    <Calendar className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Profile Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card 
            className="cursor-pointer hover:bg-accent/30 transition-all"
            onClick={() => navigate('/profile')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">My Profile</div>
                  <div className="text-sm text-muted-foreground">View and edit your information</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
