import MobileLayout from "@/components/layout/MobileLayout";
import DashboardCalendar from "@/components/dashboard/DashboardCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditCard, Calendar, Plane, MessageCircle, Heart, Image, Bell, ChevronRight, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemberData } from "@/hooks/useMemberData";
import { Loading } from "@/components/ui/loading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
        .gte('start_date', new Date().toISOString())
        .eq('is_published', true)
        .order('start_date', { ascending: true })
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

  // Fetch unread notifications count
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications-count', member?.id],
    queryFn: async () => {
      if (!member) return 0;
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!member
  });

  // Fetch recent gallery posts
  const { data: recentPosts } = useQuery({
    queryKey: ['recent-gallery-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_posts')
        .select(`
          *,
          user_profiles:member_id(full_name, avatar_url)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    }
  });

  // Check registration status for next event/trip
  const { data: registrationStatus } = useQuery({
    queryKey: ['next-activity-registration', member?.id],
    queryFn: async () => {
      if (!member || (!upcomingEvents?.length && !upcomingTrips?.length)) return null;
      
      const nextEvent = upcomingEvents?.[0];
      if (nextEvent) {
        const { data } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('event_id', nextEvent.id)
          .eq('member_id', member.id)
          .maybeSingle();
        
        return { type: 'event', activity: nextEvent, isRegistered: !!data };
      }
      
      const nextTrip = upcomingTrips?.[0];
      if (nextTrip) {
        const { data } = await supabase
          .from('trip_registrations')
          .select('*')
          .eq('trip_id', nextTrip.id)
          .eq('member_id', member.id)
          .maybeSingle();
        
        return { type: 'trip', activity: nextTrip, isRegistered: !!data };
      }
      
      return null;
    },
    enabled: !!member && !!(upcomingEvents?.length || upcomingTrips?.length)
  });

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (memberLoading) {
    return (
      <MobileLayout title="Home">
        <div className="flex items-center justify-center min-h-[400px] bg-[#1C1C1C]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  const quickActions = [
    { 
      icon: Calendar, 
      label: "Events & Trips", 
      description: `${(upcomingEvents?.length || 0) + (upcomingTrips?.length || 0)} upcoming`, 
      path: "/events", 
      color: "#00A36C"
    },
    { 
      icon: Heart, 
      label: "Donations", 
      description: "Support our cause", 
      path: "/donations", 
      color: "#B8860B"
    },
    { 
      icon: MessageCircle, 
      label: "Messages", 
      description: "Chat with members", 
      path: "/messages", 
      color: "#00A36C"
    },
    { 
      icon: CreditCard, 
      label: "My Profile", 
      description: "View & update", 
      path: "/profile", 
      color: "#B8860B"
    }
  ];

  return (
    <MobileLayout 
      title="Home"
      headerRight={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/notifications')}
            className="relative text-[#B8860B] hover:bg-white/5 h-9 w-9"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#00A36C] text-white text-xs flex items-center justify-center font-semibold">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      }
    >
      <div className="min-h-screen bg-[#1C1C1C] space-y-6 pb-6">
        {/* Personalized Header */}
        <div className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] px-6 py-8 border-b border-white/5">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-white mb-2">
              Jaya Jinendra, {member?.full_name?.split(' ')[0] || 'Member'} 👋
            </h1>
            <p className="text-gray-400 text-sm">Welcome back to Mahaveer Bhavan</p>
          </motion.div>
        </div>

        {/* Premium Digital ID Card with 3D Effect */}
        <div className="px-4">
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => navigate('/id-card')}
            className="cursor-pointer"
          >
            <Card className="bg-gradient-to-br from-[#252525] via-[#2a2a2a] to-[#1C1C1C] border-2 border-[#B8860B] overflow-hidden shadow-2xl">
              <CardContent className="p-0">
                <div 
                  className="relative p-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.1) 0%, rgba(0, 163, 108, 0.1) 100%)',
                  }}
                >
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[#B8860B] opacity-30" />
                  <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[#B8860B] opacity-30" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-3 border-[#B8860B] shadow-xl">
                        <AvatarImage src={member?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00A36C] to-[#008556] text-white text-2xl font-bold">
                          {getInitials(member?.full_name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#00A36C] border-2 border-[#1C1C1C] flex items-center justify-center">
                        <CreditCard className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {member?.full_name}
                      </h3>
                      <p className="text-[#B8860B] text-sm font-medium mb-2">
                        {member?.membership_type || 'Member'}
                      </p>
                      <Badge className="bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30 text-xs">
                        ID: {member?.id?.slice(0, 8)}
                      </Badge>
                    </div>
                    
                    <ChevronRight className="h-6 w-6 text-[#B8860B]" />
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Digital Member Card</span>
                    <span className="text-[#B8860B] text-xs font-semibold">TAP TO VIEW</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Prominent Calendar Integration */}
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#00A36C]" />
              Community Calendar
            </h2>
            <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border border-white/10 shadow-xl">
              <CardContent className="p-4">
                <DashboardCalendar />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Upcoming Activity Card */}
        {registrationStatus && (
          <div className="px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="text-lg font-bold text-white mb-3">Next Activity</h2>
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border border-white/10 shadow-xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-2">
                          {registrationStatus.activity.title}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Calendar className="h-4 w-4 text-[#B8860B]" />
                            <span>
                              {new Date(registrationStatus.activity.start_date || registrationStatus.activity.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          {registrationStatus.activity.time && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <Clock className="h-4 w-4 text-[#B8860B]" />
                              <span>{registrationStatus.activity.time}</span>
                            </div>
                          )}
                          {registrationStatus.activity.location && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <MapPin className="h-4 w-4 text-[#B8860B]" />
                              <span className="line-clamp-1">{registrationStatus.activity.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge 
                        className={cn(
                          "ml-3 flex-shrink-0",
                          registrationStatus.isRegistered 
                            ? "bg-[#00A36C]/20 text-[#00A36C] border border-[#00A36C]/30" 
                            : "bg-[#B8860B]/20 text-[#B8860B] border border-[#B8860B]/30"
                        )}
                      >
                        {registrationStatus.isRegistered ? 'Registered' : 'Register Now'}
                      </Badge>
                    </div>
                    
                    {!registrationStatus.isRegistered && (
                      <Button 
                        onClick={() => navigate(registrationStatus.type === 'event' ? '/events' : '/trips')}
                        className="w-full bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] text-white font-semibold shadow-lg"
                      >
                        Register Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Quick Access Grid */}
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-lg font-bold text-white mb-3">Quick Access</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.label}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Card
                      className="cursor-pointer bg-gradient-to-br from-[#252525] to-[#1C1C1C] border border-white/10 hover:border-white/20 transition-all shadow-lg hover:shadow-2xl overflow-hidden"
                      onClick={() => navigate(action.path)}
                    >
                      <CardContent className="p-5">
                        <div 
                          className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${action.color}20 0%, ${action.color}10 100%)`,
                            border: `1px solid ${action.color}40`
                          }}
                        >
                          <Icon className="h-6 w-6" style={{ color: action.color }} />
                        </div>
                        <h3 className="font-semibold text-white text-sm mb-1">
                          {action.label}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {action.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Gallery Preview Strip */}
        {recentPosts && recentPosts.length > 0 && (
          <div className="px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Image className="h-5 w-5 text-[#00A36C]" />
                  Recent Moments
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/gallery')}
                  className="text-[#B8860B] hover:bg-white/5 text-sm"
                >
                  View All
                </Button>
              </div>
              
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-3 pb-2">
                  {recentPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate('/gallery')}
                      className="flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-shadow border border-white/10"
                    >
                      <img
                        src={post.media_url}
                        alt={post.caption || 'Gallery post'}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default Dashboard;
