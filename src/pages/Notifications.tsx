import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  Calendar, 
  DollarSign, 
  Users,
  MessageSquare,
  Settings,
  Check,
  Trash2,
  Filter,
  Clock,
  AlertCircle,
  Info,
  CheckCircle
} from "lucide-react";

const Notifications = () => {
  const [filter, setFilter] = useState("all");

  const notifications = [
    {
      id: "notif-1",
      type: "event",
      title: "Monthly Satsang Tomorrow",
      message: "Don't forget about the monthly satsang scheduled for tomorrow at 6:00 PM in the main hall.",
      time: "2 hours ago",
      read: false,
      priority: "high",
      category: "events"
    },
    {
      id: "notif-2",
      type: "donation",
      title: "Donation Receipt Generated",
      message: "Your donation receipt for ₹5,000 has been generated and emailed to you.",
      time: "1 day ago",
      read: true,
      priority: "medium",
      category: "donations"
    },
    {
      id: "notif-3",
      type: "message",
      title: "New Message from Raj Patel",
      message: "Looking forward to the satsang tomorrow! Will there be any special arrangements?",
      time: "2 days ago",
      read: false,
      priority: "medium",
      category: "messages"
    },
    {
      id: "notif-4",
      type: "system",
      title: "Profile Updated Successfully",
      message: "Your profile information has been updated successfully.",
      time: "3 days ago",
      read: true,
      priority: "low",
      category: "system"
    },
    {
      id: "notif-5",
      type: "event",
      title: "Event Registration Confirmed",
      message: "Your registration for the Charity Drive has been confirmed. Thank you for participating!",
      time: "5 days ago",
      read: true,
      priority: "high",
      category: "events"
    },
    {
      id: "notif-6",
      type: "announcement",
      title: "New Temple Visit Announced",
      message: "We're organizing a visit to Palitana temples next month. Registration starts tomorrow.",
      time: "1 week ago",
      read: false,
      priority: "high",
      category: "announcements"
    }
  ];

  const getNotificationIcon = (type: string) => {
    const icons = {
      event: Calendar,
      donation: DollarSign,
      message: MessageSquare,
      system: Settings,
      announcement: Bell,
      general: Info
    };
    const Icon = icons[type as keyof typeof icons] || Bell;
    return Icon;
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === "high") return "text-red-500";
    if (priority === "medium") return "text-yellow-500";
    return "text-blue-500";
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "high": "destructive",
      "medium": "secondary",
      "low": "outline"
    };
    return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
  };

  const filteredNotifications = filter === "all" 
    ? notifications 
    : notifications.filter(notif => notif.category === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <MainLayout title="Notifications">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with latest announcements and activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="notifications" className="relative">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Label>Filter by category:</Label>
                  </div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="events">Events</SelectItem>
                      <SelectItem value="donations">Donations</SelectItem>
                      <SelectItem value="messages">Messages</SelectItem>
                      <SelectItem value="announcements">Announcements</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications List */}
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <Card 
                    key={notification.id} 
                    className={`cursor-pointer transition-colors ${
                      !notification.read 
                        ? "border-l-4 border-l-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full bg-muted ${getNotificationColor(notification.type, notification.priority)}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                )}
                                {getPriorityBadge(notification.priority)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{notification.time}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Button variant="ghost" size="sm">
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {filteredNotifications.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No notifications</h3>
                    <p className="text-muted-foreground">
                      {filter === "all" 
                        ? "You're all caught up! No new notifications to show."
                        : `No notifications in the ${filter} category.`
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Push Notifications */}
                <div className="space-y-4">
                  <h4 className="font-medium">Push Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive notifications even when the app is closed</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {/* Email Notifications */}
                <div className="space-y-4">
                  <h4 className="font-medium">Email Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Event Reminders</Label>
                        <p className="text-sm text-muted-foreground">Get email reminders for upcoming events</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Donation Receipts</Label>
                        <p className="text-sm text-muted-foreground">Receive donation receipts via email</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Weekly Newsletter</Label>
                        <p className="text-sm text-muted-foreground">Get weekly updates about trust activities</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                {/* WhatsApp Notifications */}
                <div className="space-y-4">
                  <h4 className="font-medium">WhatsApp Notifications</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Important Announcements</Label>
                        <p className="text-sm text-muted-foreground">Receive critical updates via WhatsApp</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Event Updates</Label>
                        <p className="text-sm text-muted-foreground">Get event-related updates on WhatsApp</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                {/* Frequency Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium">Notification Frequency</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Digest Frequency</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="daily">Daily Digest</SelectItem>
                          <SelectItem value="weekly">Weekly Digest</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Quiet Hours</Label>
                      <Select defaultValue="none">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Quiet Hours</SelectItem>
                          <SelectItem value="night">10 PM - 8 AM</SelectItem>
                          <SelectItem value="custom">Custom Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button>Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Notifications;