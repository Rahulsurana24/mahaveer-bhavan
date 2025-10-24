import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Loading } from '@/components/ui/loading';
import {
  Bell,
  User,
  Calendar,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  Home,
  Camera
} from 'lucide-react';

const MemberDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('home');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch member profile
  const { data: memberProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['member-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          user_roles (
            name,
            prefix
          )
        `)
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch unread notifications count
  const { data: notificationsCount } = useQuery({
    queryKey: ['notifications-count', user?.id],
    queryFn: async () => {
      if (!user || !memberProfile) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', memberProfile.id)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !!memberProfile
  });

  // Fetch upcoming events
  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('events')
        .select('*, event_registrations(*)')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!memberProfile
  });

  // Check if user is registered for an event
  const checkRegistration = (event: any) => {
    if (!memberProfile || !event.event_registrations) return false;
    return event.event_registrations.some(
      (reg: any) => reg.member_id === memberProfile.id
    );
  };

  // Fetch recent announcements
  const { data: recentAnnouncements } = useQuery({
    queryKey: ['recent-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    }
  });

  // Get member initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format member ID
  const formatMemberId = () => {
    if (!memberProfile?.user_roles?.prefix || !memberProfile?.member_number) {
      return 'N/A';
    }
    return `${memberProfile.user_roles.prefix}-${String(memberProfile.member_number).padStart(4, '0')}`;
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] flex items-center justify-center">
        <Loading size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#1C1C1C]/95 backdrop-blur-lg border-b border-white/10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Greeting */}
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Jaya Jinendra, {memberProfile?.full_name?.split(' ')[0] || 'Member'} 👋
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {getGreeting()} • {currentTime.toLocaleDateString('en-IN', { weekday: 'long' })}
              </p>
            </div>

            {/* Quick Access Icons */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                onClick={() => navigate('/dashboard/notifications')}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <Bell className="h-6 w-6 text-gray-300" />
                {(notificationsCount || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-[#FFD700] text-[#1C1C1C] text-xs font-bold rounded-full flex items-center justify-center">
                    {notificationsCount}
                  </span>
                )}
              </button>

              {/* Profile */}
              <button
                onClick={() => navigate('/dashboard/profile')}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <User className="h-6 w-6 text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Digital ID Card Preview */}
        <Card
          onClick={() => navigate('/dashboard/id-card')}
          className="bg-gradient-to-br from-[#00A36C] to-[#008F5C] border-none shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Profile Photo */}
              <Avatar className="h-20 w-20 border-4 border-white/20">
                <AvatarImage src={memberProfile?.photo_url || ''} alt={memberProfile?.full_name || ''} />
                <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                  {memberProfile?.full_name ? getInitials(memberProfile.full_name) : 'MB'}
                </AvatarFallback>
              </Avatar>

              {/* Member Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">{memberProfile?.full_name || 'Member'}</h2>
                  <ChevronRight className="h-5 w-5 text-white/60" />
                </div>
                <Badge className="bg-white/20 text-white border-none mb-2">
                  {memberProfile?.user_roles?.name || 'Member'}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80">Member ID:</span>
                  <span className="font-mono font-bold text-white">{formatMemberId()}</span>
                </div>
              </div>

              {/* ID Card Icon */}
              <div className="text-white/40">
                <Camera className="h-8 w-8" />
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-white/60">Tap to view full Digital ID Card</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Events & Trips */}
          <Card
            onClick={() => navigate('/dashboard/events')}
            className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00A36C]/20 rounded-full mb-3">
                <Calendar className="h-6 w-6 text-[#00A36C]" />
              </div>
              <h3 className="text-white font-semibold mb-1">Events & Trips</h3>
              <p className="text-xs text-gray-400">Browse & Register</p>
            </CardContent>
          </Card>

          {/* Make a Donation */}
          <Card
            onClick={() => navigate('/dashboard/donate')}
            className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FFD700]/20 rounded-full mb-3">
                <Heart className="h-6 w-6 text-[#FFD700]" />
              </div>
              <h3 className="text-white font-semibold mb-1">Make a Donation</h3>
              <p className="text-xs text-gray-400">Support the Trust</p>
            </CardContent>
          </Card>

          {/* Messaging Hub */}
          <Card
            onClick={() => navigate('/dashboard/messages')}
            className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-full mb-3">
                <MessageCircle className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">Messaging Hub</h3>
              <p className="text-xs text-gray-400">Chat & Connect</p>
            </CardContent>
          </Card>

          {/* Community Gallery */}
          <Card
            onClick={() => navigate('/dashboard/gallery')}
            className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-full mb-3">
                <ImageIcon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-1">Community Gallery</h3>
              <p className="text-xs text-gray-400">View & Share</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Activity Card */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-0">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#00A36C]" />
                  Upcoming Activity
                </h3>
              </div>

              <div className="p-4">
                {upcomingEvents[0] && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-semibold text-base">
                          {upcomingEvents[0].title}
                        </h4>
                        {checkRegistration(upcomingEvents[0]) ? (
                          <Badge className="bg-[#00A36C] text-white border-none">
                            Registered
                          </Badge>
                        ) : (
                          <Badge className="bg-[#FFD700] text-[#1C1C1C] border-none font-bold">
                            Open
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(upcomingEvents[0].date).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>

                        {upcomingEvents[0].location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{upcomingEvents[0].location}</span>
                          </div>
                        )}

                        {upcomingEvents[0].max_participants && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>
                              {upcomingEvents[0].event_registrations?.length || 0} / {upcomingEvents[0].max_participants} registered
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!checkRegistration(upcomingEvents[0]) && (
                      <Button
                        onClick={() => navigate(`/dashboard/events/${upcomingEvents[0].id}`)}
                        className="w-full bg-[#FFD700] hover:bg-[#FFC700] text-[#1C1C1C] font-bold"
                      >
                        View & Register
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                <Separator className="my-4 bg-white/10" />

                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard/events')}
                  className="w-full text-[#00A36C] hover:text-[#008F5C] hover:bg-white/5"
                >
                  View All Events
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Announcements */}
        {recentAnnouncements && recentAnnouncements.length > 0 && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-0">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#FFD700]" />
                  Trust Announcements
                </h3>
              </div>

              <div className="divide-y divide-white/10">
                {recentAnnouncements.map((announcement: any) => (
                  <div
                    key={announcement.id}
                    onClick={() => navigate(`/dashboard/announcement/${announcement.id}`)}
                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{announcement.title}</h4>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {announcement.content?.substring(0, 100)}...
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(announcement.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard/announcements')}
                  className="w-full text-[#FFD700] hover:text-[#FFC700] hover:bg-white/5"
                >
                  View All Announcements
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Persistent Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1C1C1C]/95 backdrop-blur-lg border-t border-white/10 z-50">
        <div className="flex items-center justify-around py-2">
          {/* Home */}
          <button
            onClick={() => {
              setActiveTab('home');
              navigate('/dashboard');
            }}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
          >
            <Home className={`h-6 w-6 ${activeTab === 'home' ? 'text-[#FFD700]' : 'text-gray-400'}`} />
            <span className={`text-xs ${activeTab === 'home' ? 'text-[#FFD700] font-semibold' : 'text-gray-400'}`}>
              Home
            </span>
          </button>

          {/* Events & Trips */}
          <button
            onClick={() => {
              setActiveTab('events');
              navigate('/dashboard/events');
            }}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
          >
            <Calendar className={`h-6 w-6 ${activeTab === 'events' ? 'text-[#FFD700]' : 'text-gray-400'}`} />
            <span className={`text-xs ${activeTab === 'events' ? 'text-[#FFD700] font-semibold' : 'text-gray-400'}`}>
              Events
            </span>
          </button>

          {/* Gallery */}
          <button
            onClick={() => {
              setActiveTab('gallery');
              navigate('/dashboard/gallery');
            }}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
          >
            <ImageIcon className={`h-6 w-6 ${activeTab === 'gallery' ? 'text-[#FFD700]' : 'text-gray-400'}`} />
            <span className={`text-xs ${activeTab === 'gallery' ? 'text-[#FFD700] font-semibold' : 'text-gray-400'}`}>
              Gallery
            </span>
          </button>

          {/* Messaging */}
          <button
            onClick={() => {
              setActiveTab('messages');
              navigate('/dashboard/messages');
            }}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
          >
            <MessageCircle className={`h-6 w-6 ${activeTab === 'messages' ? 'text-[#FFD700]' : 'text-gray-400'}`} />
            <span className={`text-xs ${activeTab === 'messages' ? 'text-[#FFD700] font-semibold' : 'text-gray-400'}`}>
              Messages
            </span>
          </button>

          {/* Profile */}
          <button
            onClick={() => {
              setActiveTab('profile');
              navigate('/dashboard/profile');
            }}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors"
          >
            <User className={`h-6 w-6 ${activeTab === 'profile' ? 'text-[#FFD700]' : 'text-gray-400'}`} />
            <span className={`text-xs ${activeTab === 'profile' ? 'text-[#FFD700] font-semibold' : 'text-gray-400'}`}>
              Profile
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
