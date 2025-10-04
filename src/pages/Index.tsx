import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, Plane, MessageCircle, Heart, Image } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useMemberData } from "@/hooks/useMemberData";

const Index = () => {
  const { user } = useAuth();
  const { member, loading } = useMemberData();
  const navigate = useNavigate();
  
  const quickActions = [
    { icon: CreditCard, label: "View ID Card", description: "Access your digital membership card", path: "/id-card" },
    { icon: Calendar, label: "Upcoming Events", description: "Browse and register for events", path: "/events" },
    { icon: Plane, label: "Trips & Tours", description: "Explore and book trips", path: "/trips" },
    { icon: MessageCircle, label: "Messages", description: "Chat with other members", path: "/messages" },
    { icon: Heart, label: "Make Donation", description: "Support our charitable work", path: "/donations" },
    { icon: Image, label: "Gallery", description: "View photos and videos", path: "/gallery" },
  ];

  return (
    <MainLayout title="Welcome">
      <div className="p-4 space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {member?.full_name || user?.email?.split('@')[0] || 'Member'}
          </h1>
          <p className="text-muted-foreground">Sree Mahaveer Swami Charitable Trust</p>
          {member && (
            <div className="text-sm text-muted-foreground">
              Member ID: {member.id} | {member.membership_type}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">1,248</div>
              <div className="text-sm text-muted-foreground">Members</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-accent">15</div>
              <div className="text-sm text-muted-foreground">Events</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions with Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <div className="grid gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card 
                    key={action.label} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
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
          </div>
        </motion.div>

        {/* Recent Activity with Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest updates from the trust</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-2 w-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Monthly Meeting Scheduled</div>
                  <div className="text-xs text-muted-foreground">Tomorrow at 6:00 PM</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-2 w-2 bg-accent rounded-full"></div>
                <div className="flex-1">
                  <div className="font-medium text-sm">New Member Welcome Event</div>
                  <div className="text-xs text-muted-foreground">This Sunday</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Index;
