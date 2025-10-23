import { AdminLayout } from "@/components/layout/admin-layout";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, DollarSign, MessageSquare, Settings, Shield, TrendingUp, Plane, UserPlus, Plus, Send, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/ui/loading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { startOfMonth, subMonths, format } from 'date-fns';

const UnifiedDashboard = () => {
  const { role, loading } = useUserProfile();
  const navigate = useNavigate();

  // Fetch comprehensive statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // Get current month and last month dates
      const currentMonthStart = startOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));

      // Total members
      const { count: totalMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      // New registrations this month
      const { count: newMembersThisMonth } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentMonthStart.toISOString());

      // New registrations last month
      const { count: newMembersLastMonth } = await supabase
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
        .eq('status', 'published');

      // Donations this month
      const { data: donationsThisMonth } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', currentMonthStart.toISOString());

      const totalDonationsThisMonth = donationsThisMonth?.reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;

      // Donations last month
      const { data: donationsLastMonth } = await supabase
        .from('donations')
        .select('amount')
        .gte('created_at', lastMonthStart.toISOString())
        .lt('created_at', currentMonthStart.toISOString());

      const totalDonationsLastMonth = donationsLastMonth?.reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;

      // Calculate growth percentages
      const memberGrowth = newMembersLastMonth > 0
        ? ((newMembersThisMonth! - newMembersLastMonth) / newMembersLastMonth) * 100
        : 0;

      const donationGrowth = totalDonationsLastMonth > 0
        ? ((totalDonationsThisMonth - totalDonationsLastMonth) / totalDonationsLastMonth) * 100
        : 0;

      return {
        totalMembers: totalMembers || 0,
        newMembersThisMonth: newMembersThisMonth || 0,
        memberGrowth: memberGrowth,
        activeEvents: activeEvents || 0,
        activeTrips: activeTrips || 0,
        totalDonationsThisMonth: totalDonationsThisMonth,
        donationGrowth: donationGrowth
      };
    }
  });

  // Fetch membership growth data (last 6 months)
  const { data: membershipTrend } = useQuery({
    queryKey: ['membership-trend'],
    queryFn: async () => {
      const trends = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = startOfMonth(subMonths(new Date(), i - 1));

        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString());

        trends.push({
          month: format(monthStart, 'MMM yyyy'),
          members: count || 0
        });
      }
      return trends;
    }
  });

  // Fetch donation trend data (last 6 months)
  const { data: donationTrend } = useQuery({
    queryKey: ['donation-trend'],
    queryFn: async () => {
      const trends = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = startOfMonth(subMonths(new Date(), i - 1));

        const { data } = await supabase
          .from('donations')
          .select('amount')
          .gte('created_at', monthStart.toISOString())
          .lt('created_at', monthEnd.toISOString());

        const total = data?.reduce((sum, d) => sum + Number(d.amount || 0), 0) || 0;

        trends.push({
          month: format(monthStart, 'MMM yyyy'),
          donations: total
        });
      }
      return trends;
    }
  });

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" text="Loading dashboard..." />
        </div>
      </AdminLayout>
    );
  }

  const isSuperAdmin = role?.name === 'superadmin';
  const isFullAdmin = role?.name === 'admin' || isSuperAdmin;
  const isManagementAdmin = role?.name === 'management_admin';
  const isViewOnly = role?.name === 'view_only_admin';

  // Enhanced KPI cards with trend indicators
  const kpiCards = [
    {
      title: "Total Members",
      value: stats?.totalMembers || 0,
      icon: Users,
      trend: stats?.memberGrowth || 0,
      trendLabel: `${stats?.newMembersThisMonth || 0} this month`,
      visible: true
    },
    {
      title: "New Registrations",
      value: stats?.newMembersThisMonth || 0,
      icon: UserPlus,
      trend: stats?.memberGrowth || 0,
      trendLabel: "Last 30 days",
      visible: true
    },
    {
      title: "Active Events",
      value: stats?.activeEvents || 0,
      icon: Calendar,
      trend: 0,
      trendLabel: "Published",
      visible: true
    },
    {
      title: "Monthly Donations",
      value: `₹${(stats?.totalDonationsThisMonth || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      trend: stats?.donationGrowth || 0,
      trendLabel: "This month",
      visible: isFullAdmin
    }
  ];

  // Quick action buttons
  const quickActions = [
    {
      label: "Create New Member",
      icon: UserPlus,
      onClick: () => navigate('/admin/members'),
      visible: isFullAdmin
    },
    {
      label: "Create Event/Trip",
      icon: Plus,
      onClick: () => navigate('/admin/events'),
      visible: isFullAdmin || isManagementAdmin
    },
    {
      label: "Send Bulk Message",
      icon: Send,
      onClick: () => navigate('/admin/communications'),
      visible: isFullAdmin
    }
  ];

  // Feature modules
  const features = [
    {
      title: "User Management",
      description: "Manage member accounts and profiles",
      icon: Users,
      path: "/admin/members",
      visible: isFullAdmin || isViewOnly,
      canEdit: isFullAdmin
    },
    {
      title: "Admin Management",
      description: "Create and manage admin accounts",
      icon: Shield,
      path: "/admin/admins",
      visible: isSuperAdmin,
      canEdit: isSuperAdmin,
      badge: "Super Admin Only"
    },
    {
      title: "Event Management",
      description: "Create and manage events",
      icon: Calendar,
      path: "/admin/events",
      visible: isFullAdmin || isManagementAdmin,
      canEdit: isFullAdmin || isManagementAdmin
    },
    {
      title: "Trip Management",
      description: "Create and manage trips & tours",
      icon: Plane,
      path: "/admin/trips",
      visible: isFullAdmin || isManagementAdmin,
      canEdit: isFullAdmin || isManagementAdmin
    },
    {
      title: "Communication Center",
      description: "Send bulk messages to members",
      icon: MessageSquare,
      path: "/admin/communications",
      visible: isFullAdmin,
      canEdit: isFullAdmin
    },
    {
      title: "Financial Management",
      description: "Monitor donations and transactions",
      icon: DollarSign,
      path: "/admin/finances",
      visible: isFullAdmin,
      canEdit: isFullAdmin
    },
    {
      title: "Reports & Analytics",
      description: "Generate comprehensive reports",
      icon: TrendingUp,
      path: "/admin/reports",
      visible: true,
      canEdit: false
    },
    {
      title: "System Settings",
      description: "Configure system and security",
      icon: Settings,
      path: "/admin/settings",
      visible: isSuperAdmin,
      canEdit: isSuperAdmin,
      badge: "Super Admin Only"
    }
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header with Role Badge */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your unified control panel</p>
          </div>
          <Badge variant="default" className="text-sm">
            {role?.name === 'superadmin' && 'Super Admin'}
            {role?.name === 'admin' && 'Administrator'}
            {role?.name === 'management_admin' && 'Management Admin'}
            {role?.name === 'view_only_admin' && 'View Only'}
          </Badge>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.filter(a => a.visible).map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                size="lg"
                onClick={action.onClick}
                className="h-16 text-lg"
              >
                <Icon className="h-5 w-5 mr-2" />
                {action.label}
              </Button>
            );
          })}
        </div>

        {/* Enhanced KPI Cards with Trend Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.filter(card => card.visible).map((card) => {
            const Icon = card.icon;
            const isPositive = card.trend >= 0;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <div className="flex items-center mt-2 text-xs">
                    {card.trend !== 0 && (
                      <>
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span className={isPositive ? "text-green-500" : "text-red-500"}>
                          {Math.abs(card.trend).toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground ml-1">
                          {card.trendLabel}
                        </span>
                      </>
                    )}
                    {card.trend === 0 && (
                      <span className="text-muted-foreground">{card.trendLabel}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trend Visualization Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Membership Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Membership Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={membershipTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Donation Volume Chart */}
          {isFullAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Donation Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={donationTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                    <Legend />
                    <Bar dataKey="donations" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity Feed and Feature Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed - Takes 1 column */}
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>

          {/* Feature Modules - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div>
              <h2 className="text-2xl font-bold mb-4">Available Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.filter(f => f.visible).map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{feature.title}</CardTitle>
                              {feature.badge && (
                                <Badge variant="secondary" className="mt-1 text-xs">{feature.badge}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                        <Button
                          className="w-full"
                          onClick={() => navigate(feature.path)}
                          variant={feature.canEdit ? "default" : "outline"}
                          size="sm"
                        >
                          {feature.canEdit ? "Manage" : "View"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Permission Notice for View-Only Admins */}
        {isViewOnly && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-500" />
                <p className="text-sm text-muted-foreground">
                  You have view-only access. Contact a Super Admin to request additional permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default UnifiedDashboard;
