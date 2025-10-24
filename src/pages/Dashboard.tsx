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
import { Card3D } from "@/components/3d/Card3D";
import { Float3D } from "@/components/3d/Float3D";

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
        <div className="flex items-center justify-center min-h-[400px] bg-black">
          <Loading size="lg" text="Loading your dashboard..." />
        </div>
      </MainLayout>
    );
  }

  const quickActions = [
    { icon: CreditCard, label: "Digital ID Card", description: "View and download", path: "/id-card", color: "from-blue-500 to-cyan-600" },
    { icon: Calendar, label: "Events", description: `${upcomingEvents?.length || 0} upcoming`, path: "/events", color: "from-green-500 to-emerald-600" },
    { icon: Plane, label: "Trips & Tours", description: `${upcomingTrips?.length || 0} available`, path: "/trips", color: "from-purple-500 to-pink-600" },
    { icon: MessageCircle, label: "Messages", description: "Chat with members", path: "/messages", color: "from-orange-500 to-red-600" },
    { icon: Heart, label: "Donations", description: "Support our cause", path: "/donations", color: "from-red-500 to-rose-600" },
    { icon: Image, label: "Gallery", description: "Photos & videos", path: "/gallery", color: "from-pink-500 to-purple-600" },
  ];

  return (
    <MainLayout title="Dashboard">
      <div className="min-h-screen bg-black text-white p-6 space-y-6">
        {/* Gradient orbs background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 relative z-10"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Welcome, {member?.full_name || 'Member'}!
          </h1>
          <p className="text-white/70 text-lg">Sree Mahaveer Swami Charitable Trust</p>
          {member && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
                {member.membership_type}
              </Badge>
              <Badge className="bg-white/10 text-white border-white/20">
                ID: {member.id?.slice(0, 8)}
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Notifications Alert */}
        {notifications && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10"
          >
            <Card3D intensity={8}>
              <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-xl text-white">Notifications</CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate('/notifications')}
                      className="text-orange-400 hover:text-orange-300 hover:bg-white/10"
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {notifications.slice(0, 2).map((notif) => (
                    <div key={notif.id} className="text-sm p-3 bg-black/30 backdrop-blur rounded-xl border border-white/10">
                      <div className="font-semibold text-white">{notif.title}</div>
                      <div className="text-white/70 text-xs mt-1">{notif.content}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Card3D>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 relative z-10"
        >
          <Card3D intensity={10}>
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 hover:border-green-500/50 transition-all">
              <CardContent className="p-6 text-center">
                <Float3D duration={2.5} yOffset={8}>
                  <Calendar className="h-8 w-8 mx-auto mb-3 text-green-400" />
                </Float3D>
                <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  {upcomingEvents?.length || 0}
                </div>
                <div className="text-sm text-white/60 mt-1">Upcoming Events</div>
              </CardContent>
            </Card>
          </Card3D>
          <Card3D intensity={10}>
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 hover:border-purple-500/50 transition-all">
              <CardContent className="p-6 text-center">
                <Float3D duration={2.5} yOffset={8} delay={0.1}>
                  <Plane className="h-8 w-8 mx-auto mb-3 text-purple-400" />
                </Float3D>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  {upcomingTrips?.length || 0}
                </div>
                <div className="text-sm text-white/60 mt-1">Available Trips</div>
              </CardContent>
            </Card>
          </Card3D>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 relative z-10"
        >
          <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
          <div className="grid gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Card3D key={action.label} intensity={8}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <Card 
                      className="cursor-pointer bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 hover:border-orange-500/50 transition-all group"
                      onClick={() => navigate(action.path)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <div className={`h-14 w-14 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                            <Icon className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-lg text-white">{action.label}</div>
                            <div className="text-sm text-white/60">{action.description}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Card3D>
              );
            })}
          </div>
        </motion.div>

        {/* Upcoming Events Preview */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative z-10"
          >
            <Card3D intensity={8}>
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-green-400" />
                      Upcoming Events
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/events')}
                      className="text-orange-400 hover:text-orange-300 hover:bg-white/10"
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div 
                      key={event.id}
                      className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 hover:border-orange-500/50 transition-all"
                      onClick={() => navigate(`/events`)}
                    >
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{event.title}</div>
                        <div className="text-sm text-white/60">
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </Card3D>
          </motion.div>
        )}

        {/* Profile Quick Access */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-10"
        >
          <Card3D intensity={8}>
            <Card 
              className="cursor-pointer bg-gradient-to-r from-orange-500/10 to-red-500/10 border-white/10 backdrop-blur-xl hover:from-orange-500/20 hover:to-red-500/20 hover:border-orange-500/50 transition-all"
              onClick={() => navigate('/profile')}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-white">My Profile</div>
                    <div className="text-sm text-white/60">View and edit your information</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Card3D>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
