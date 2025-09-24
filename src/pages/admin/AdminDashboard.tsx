import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, MessageSquare, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const stats = [
    { title: "Total Members", value: "1,234", icon: Users, change: "+5.2%", changeType: "positive" },
    { title: "Active Events", value: "12", icon: Calendar, change: "+2", changeType: "positive" },
    { title: "Monthly Donations", value: "₹2,45,000", icon: DollarSign, change: "+12.5%", changeType: "positive" },
    { title: "Messages Sent", value: "8,456", icon: MessageSquare, change: "+18.2%", changeType: "positive" },
  ];

  const recentActivities = [
    { type: "member", message: "New member registration: Raj Patel", time: "2 minutes ago" },
    { type: "event", message: "Satsang event updated with new venue", time: "15 minutes ago" },
    { type: "donation", message: "Donation received: ₹5,000 from Meera Shah", time: "1 hour ago" },
    { type: "system", message: "WhatsApp integration restored", time: "2 hours ago" },
  ];

  const upcomingEvents = [
    { title: "Monthly Satsang", date: "2024-01-15", participants: 145 },
    { title: "Charity Drive", date: "2024-01-20", participants: 89 },
    { title: "Temple Visit", date: "2024-01-25", participants: 67 },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
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
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span className="text-primary">{stat.change}</span>
                    <span className="ml-1">from last month</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {activity.type === "member" && <Users className="h-4 w-4 text-blue-500" />}
                      {activity.type === "event" && <Calendar className="h-4 w-4 text-green-500" />}
                      {activity.type === "donation" && <DollarSign className="h-4 w-4 text-yellow-500" />}
                      {activity.type === "system" && <AlertCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Button variant="outline" size="sm">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge variant="secondary">{event.participants} registered</Badge>
                  </div>
                ))}
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
              <Button variant="outline" className="h-20 flex-col">
                <Users className="h-6 w-6 mb-2" />
                Add Member
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Calendar className="h-6 w-6 mb-2" />
                Create Event
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <MessageSquare className="h-6 w-6 mb-2" />
                Send Message
              </Button>
              <Button variant="outline" className="h-20 flex-col">
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