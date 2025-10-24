import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Search,
  QrCode,
  Plus,
  Send,
  UserCheck,
  Users,
  UserPlus,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plane,
  MessageSquare,
  Settings,
  Shield,
  FileText,
  Image as ImageIcon,
  ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { formatDistanceToNow, startOfMonth, subMonths } from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";

const MobileAdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useUserProfile();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['mobile-admin-stats'],
    queryFn: async () => {
      const currentMonthStart = startOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));

      // Total members
      const { count: totalMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      // New registrations this month
      const { count: newRegistrations } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentMonthStart.toISOString());

      // New registrations last month (for growth calculation)
      const { count: newRegistrationsLastMonth } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastMonthStart.toISOString())
        .lt('created_at', currentMonthStart.toISOString());

      // Active events
      const { count: activeEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      // Active trips
      const { count: activeTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      // Donations this month
      const { data: donations } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', currentMonthStart.toISOString())
        .eq('status', 'completed');

      const totalDonations = donations?.reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;

      // Donations last month (for growth calculation)
      const { data: donationsLastMonth } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', lastMonthStart.toISOString())
        .lt('created_at', currentMonthStart.toISOString())
        .eq('status', 'completed');

      const totalDonationsLastMonth = donationsLastMonth?.reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;

      // Calculate growth percentages
      const memberGrowth = newRegistrationsLastMonth && newRegistrationsLastMonth > 0
        ? ((newRegistrations! - newRegistrationsLastMonth) / newRegistrationsLastMonth) * 100
        : 0;

      const donationGrowth = totalDonationsLastMonth > 0
        ? ((totalDonations - totalDonationsLastMonth) / totalDonationsLastMonth) * 100
        : 0;

      // Pending approvals (if applicable)
      const { count: pendingApprovals } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        totalMembers: totalMembers || 0,
        newRegistrations: newRegistrations || 0,
        memberGrowth,
        activeEvents: (activeEvents || 0) + (activeTrips || 0),
        totalDonations,
        donationGrowth,
        pendingApprovals: pendingApprovals || 0
      };
    }
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      // Get recent member registrations
      const { data: members } = await supabase
        .from('members')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      // Get recent donations
      const { data: donations } = await supabase
        .from('donations')
        .select('id, amount, created_at, members(full_name)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(3);

      // Get recent event registrations
      const { data: eventRegs } = await supabase
        .from('event_registrations')
        .select('id, created_at, members(full_name), events(title)')
        .order('created_at', { ascending: false })
        .limit(3);

      // Combine and sort all activities
      const activities: any[] = [];

      members?.forEach(m => {
        activities.push({
          id: `member-${m.id}`,
          type: 'member',
          message: `${m.full_name} registered as new member`,
          timestamp: m.created_at,
          icon: 'UserPlus'
        });
      });

      donations?.forEach(d => {
        activities.push({
          id: `donation-${d.id}`,
          type: 'donation',
          message: `₹${d.amount.toLocaleString()} donation received`,
          timestamp: d.created_at,
          icon: 'DollarSign'
        });
      });

      eventRegs?.forEach(r => {
        activities.push({
          id: `event-${r.id}`,
          type: 'event',
          message: `${r.members?.full_name} registered for ${r.events?.title}`,
          timestamp: r.created_at,
          icon: 'Calendar'
        });
      });

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    }
  });

  // Fetch unread notifications count
  const { data: notificationCount } = useQuery({
    queryKey: ['admin-notification-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      return count || 0;
    }
  });

  const isSuperAdmin = role?.name === 'superadmin';
  const isFullAdmin = role?.name === 'admin' || isSuperAdmin;

  // KPI Cards
  const kpiCards = [
    {
      title: "Total Members",
      value: stats?.totalMembers || 0,
      icon: Users,
      color: "#00A36C",
      bgColor: "bg-[#00A36C]/10",
      trend: stats?.memberGrowth || 0,
      trendLabel: `${stats?.newRegistrations || 0} new`
    },
    {
      title: "New Registrations",
      value: stats?.newRegistrations || 0,
      icon: UserPlus,
      color: "#B8860B",
      bgColor: "bg-[#B8860B]/10",
      trend: stats?.memberGrowth || 0,
      trendLabel: "This month"
    },
    {
      title: "Donations (30d)",
      value: `₹${(stats?.totalDonations || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: "#00A36C",
      bgColor: "bg-[#00A36C]/10",
      trend: stats?.donationGrowth || 0,
      trendLabel: "This month"
    },
    {
      title: "Active Events",
      value: stats?.activeEvents || 0,
      icon: Calendar,
      color: "#B8860B",
      bgColor: "bg-[#B8860B]/10",
      trend: 0,
      trendLabel: "Published"
    }
  ];

  // Quick Actions
  const quickActions = [
    {
      label: "Scan Attendance",
      icon: QrCode,
      color: "from-[#00A36C] to-[#008556]",
      onClick: () => navigate('/admin/attendance')
    },
    {
      label: "Create Event/Trip",
      icon: Plus,
      color: "from-[#B8860B] to-[#9a7209]",
      onClick: () => navigate('/admin/calendar')
    },
    {
      label: "Send Bulk Message",
      icon: Send,
      color: "from-[#00A36C] to-[#008556]",
      onClick: () => navigate('/admin/communications')
    },
    {
      label: "Review Approvals",
      icon: UserCheck,
      color: "from-[#B8860B] to-[#9a7209]",
      onClick: () => navigate('/admin/members'),
      badge: stats?.pendingApprovals || 0
    }
  ];

  // Management Modules
  const managementModules = [
    {
      title: "User Management",
      description: "Manage member accounts",
      icon: Users,
      color: "#00A36C",
      path: "/admin/members"
    },
    {
      title: "Calendar Management",
      description: "Event scheduling",
      icon: Calendar,
      color: "#B8860B",
      path: "/admin/calendar"
    },
    {
      title: "Event Management",
      description: "Create and manage events",
      icon: Plane,
      color: "#00A36C",
      path: "/admin/events"
    },
    {
      title: "Trip Management",
      description: "Manage trips and tours",
      icon: Plane,
      color: "#B8860B",
      path: "/admin/trips"
    },
    {
      title: "Communications",
      description: "Bulk messaging",
      icon: MessageSquare,
      color: "#00A36C",
      path: "/admin/communications"
    },
    {
      title: "Financial Management",
      description: "Donations and reports",
      icon: DollarSign,
      color: "#B8860B",
      path: "/admin/finances",
      visible: isFullAdmin
    },
    {
      title: "Gallery Management",
      description: "Moderate posts",
      icon: ImageIcon,
      color: "#00A36C",
      path: "/admin/gallery"
    },
    {
      title: "System Settings",
      description: "App configuration",
      icon: Settings,
      color: "#B8860B",
      path: "/admin/settings",
      visible: isSuperAdmin
    }
  ];

  const getActivityIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      UserPlus,
      DollarSign,
      Calendar
    };
    return icons[iconName] || Bell;
  };

  if (statsLoading) {
    return (
      <MobileLayout title="Admin Dashboard">
        <div className="flex justify-center items-center min-h-screen bg-[#1C1C1C]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Admin Dashboard"
      headerRight={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-[#B8860B] hover:bg-white/5"
            onClick={() => navigate('/admin/notifications')}
          >
            <Bell className="h-5 w-5" />
            {notificationCount && notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-[#00A36C] border-2 border-[#1C1C1C]">
                {notificationCount}
              </Badge>
            )}
          </Button>
        </div>
      }
    >
      <div className="min-h-screen bg-[#1C1C1C] pb-6">
        {/* Admin Info Bar */}
        <div className="sticky top-14 z-30 bg-gradient-to-b from-[#252525] to-[#1C1C1C] border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-bold text-lg">Welcome, Admin</h2>
              <Badge className="bg-[#B8860B]/20 text-[#B8860B] border border-[#B8860B]/30 mt-1">
                {role?.name === 'superadmin' && 'Super Administrator'}
                {role?.name === 'admin' && 'Administrator'}
                {role?.name === 'management_admin' && 'Management Admin'}
              </Badge>
            </div>
          </div>

          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search members, events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* KPI Summary Cards - Horizontally Scrollable */}
        <div className="px-4 py-6">
          <h3 className="text-white font-semibold text-sm mb-3">Key Metrics</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {kpiCards.map((card, index) => {
              const Icon = card.icon;
              const isPositive = card.trend >= 0;

              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex-shrink-0 w-44"
                >
                  <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 h-full">
                    <CardContent className="p-4">
                      <div className={cn("p-2 rounded-lg w-fit mb-2", card.bgColor)}>
                        <Icon className="h-5 w-5" style={{ color: card.color }} />
                      </div>

                      <div className="text-2xl font-bold text-white mb-1">
                        {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                      </div>

                      <p className="text-xs text-gray-400 mb-2">{card.title}</p>

                      {card.trend !== 0 && (
                        <div className="flex items-center gap-1">
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3 text-[#00A36C]" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-400" />
                          )}
                          <span className={cn("text-xs font-medium", isPositive ? "text-[#00A36C]" : "text-red-400")}>
                            {Math.abs(card.trend).toFixed(1)}%
                          </span>
                          <span className="text-xs text-gray-500">{card.trendLabel}</span>
                        </div>
                      )}

                      {card.trend === 0 && (
                        <p className="text-xs text-gray-500">{card.trendLabel}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Quick Action Grid */}
        <div className="px-4 pb-6">
          <h3 className="text-white font-semibold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;

              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 cursor-pointer hover:border-[#00A36C]/30 transition-all relative overflow-hidden"
                    onClick={action.onClick}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <div className={cn("p-3 rounded-full mb-3 bg-gradient-to-br", action.color)}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-white text-sm font-medium">{action.label}</p>

                      {action.badge !== undefined && action.badge > 0 && (
                        <Badge className="absolute top-2 right-2 bg-[#00A36C] border-2 border-[#1C1C1C]">
                          {action.badge}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="px-4 pb-6">
          <h3 className="text-white font-semibold text-sm mb-3">Recent Activity</h3>
          <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
            <CardContent className="p-0">
              {recentActivity && recentActivity.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {recentActivity.slice(0, 5).map((activity, index) => {
                    const Icon = getActivityIcon(activity.icon);

                    return (
                      <div key={activity.id} className="p-3 flex items-start gap-3">
                        <div className="p-2 rounded-full bg-[#00A36C]/10 flex-shrink-0">
                          <Icon className="h-4 w-4 text-[#00A36C]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm">{activity.message}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Bell className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Management Modules */}
        <div className="px-4 pb-6">
          <h3 className="text-white font-semibold text-sm mb-3">Management Tools</h3>
          <div className="space-y-3">
            {managementModules
              .filter(module => module.visible !== false)
              .map((module, index) => {
                const Icon = module.icon;

                return (
                  <motion.div
                    key={module.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 cursor-pointer hover:border-[#00A36C]/30 transition-all"
                      onClick={() => navigate(module.path)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className="p-2.5 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: `${module.color}20` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: module.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-sm">{module.title}</h4>
                          <p className="text-gray-400 text-xs">{module.description}</p>
                        </div>

                        <ChevronRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileAdminDashboard;
