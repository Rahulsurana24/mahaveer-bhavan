import { AdminLayout } from "@/components/layout/admin-layout";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, DollarSign, MessageSquare, Settings, Shield, TrendingUp, Plane } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/ui/loading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const UnifiedDashboard = () => {
  const { role, loading } = useUserProfile();
  const navigate = useNavigate();

  // Fetch real-time statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [membersRes, eventsRes, tripsRes, donationsRes] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('donations').select('amount').gte('created_at', new Date(new Date().setDate(1)).toISOString())
      ]);

      const totalDonations = donationsRes.data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      return {
        totalMembers: membersRes.count || 0,
        activeEvents: eventsRes.count || 0,
        activeTrips: tripsRes.count || 0,
        monthlyDonations: totalDonations
      };
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

  // Define feature modules based on role
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

  const statsCards = [
    { title: "Total Members", value: stats?.totalMembers || 0, icon: Users, visible: true },
    { title: "Active Events", value: stats?.activeEvents || 0, icon: Calendar, visible: true },
    { title: "Active Trips", value: stats?.activeTrips || 0, icon: Plane, visible: true },
    { title: "Monthly Donations", value: `₹${(stats?.monthlyDonations || 0).toLocaleString('en-IN')}`, icon: DollarSign, visible: isFullAdmin }
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Role Badge */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.filter(stat => stat.visible).map((stat) => {
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

        {/* Feature Modules */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          <CardTitle className="text-lg">{feature.title}</CardTitle>
                          {feature.badge && (
                            <Badge variant="secondary" className="mt-1">{feature.badge}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <CardDescription className="mt-2">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate(feature.path)}
                      variant={feature.canEdit ? "default" : "outline"}
                    >
                      {feature.canEdit ? "Manage" : "View"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
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
