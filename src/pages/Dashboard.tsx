import MobileLayout from "@/components/layout/MobileLayout";
import DashboardCalendar from "@/components/dashboard/DashboardCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditCard, Calendar, Plane, MessageCircle, Heart, Image, Bell, User, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemberData } from "@/hooks/useMemberData";
import { Loading } from "@/components/ui/loading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  if (memberLoading) {
    return (
      <MobileLayout title="Home">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  const quickActions = [
    { 
      icon: CreditCard, 
      label: "Digital ID Card", 
      description: "View and download", 
      path: "/id-card", 
      color: "bg-blue-500",
      gradient: "from-blue-500 to-blue-600"
    },
    { 
      icon: Calendar, 
      label: "Events", 
      description: `${upcomingEvents?.length || 0} upcoming`, 
      path: "/events", 
      color: "bg-green-500",
      gradient: "from-green-500 to-emerald-600"
    },
    { 
      icon: Plane, 
      label: "Trips & Tours", 
      description: `${upcomingTrips?.length || 0} available`, 
      path: "/trips", 
      color: "bg-purple-500",
      gradient: "from-purple-500 to-pink-600"
    },
    { 
      icon: MessageCircle, 
      label: "Messages", 
      description: "Chat with members", 
      path: "/messages", 
      color: "bg-[#25D366]",
      gradient: "from-[#25D366] to-[#1ea952]"
    },
    { 
      icon: Heart, 
      label: "Donations", 
      description: "Support our cause", 
      path: "/donations", 
      color: "bg-red-500",
      gradient: "from-red-500 to-rose-600"
    },
    { 
      icon: Image, 
      label: "Gallery", 
      description: "Photos & videos", 
      path: "/gallery", 
      color: "bg-pink-500",
      gradient: "from-pink-500 to-purple-600"
    },
  ];

  return (
    <MobileLayout title="Home">
      <div className="space-y-4">
        {/* Profile Header */}
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src={member?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(member?.full_name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {member?.full_name || 'Member'}
              </h2>
              <p className="text-sm text-gray-600">Mahaveer Bhavan Member</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {member?.membership_type || 'Member'}
                </Badge>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">
                    {unreadCount} new notifications
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
              className="flex-shrink-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-700">
                  {upcomingEvents?.length || 0}
                </div>
                <div className="text-xs text-green-600">Upcoming Events</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-4 text-center">
                <Plane className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-purple-700">
                  {upcomingTrips?.length || 0}
                </div>
                <div className="text-xs text-purple-600">Available Trips</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Calendar Widget */}
        <div className="px-4">
          <DashboardCalendar />
        </div>

        {/* Quick Actions */}
        <div className="px-4 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="grid gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.label}
                  className="cursor-pointer hover:shadow-md transition-shadow border-gray-200"
                  onClick={() => navigate(action.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                        `bg-gradient-to-br ${action.gradient}`
                      )}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">
                          {action.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {action.description}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Posts Preview - Instagram Style */}
        {recentPosts && recentPosts.length > 0 && (
          <div className="px-4 space-y-3 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Posts</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/gallery')}
                className="text-primary"
              >
                See All
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {recentPosts.slice(0, 6).map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate('/gallery')}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img
                    src={post.media_url}
                    alt={post.caption || 'Post'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default Dashboard;
