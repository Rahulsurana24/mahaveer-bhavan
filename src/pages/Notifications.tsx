import { useState } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Calendar, 
  DollarSign, 
  Users,
  MessageSquare,
  Settings,
  Check,
  Trash2,
  Clock,
  Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications from database
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_id', userData.user?.id)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "All marked as read" });
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Notification deleted" });
    }
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

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

  const filteredNotifications = activeTab === "all" 
    ? notifications 
    : activeTab === "unread"
    ? notifications.filter(n => !n.is_read)
    : notifications.filter(notif => notif.type === activeTab);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <MobileLayout title="Notifications">
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout 
      title="Notifications"
      headerRight={
        unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="h-9 text-xs"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark All
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {/* Pill Tabs */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b">
          {[
            { value: "all", label: "All" },
            { value: "unread", label: "Unread", badge: unreadCount },
            { value: "announcement", label: "Announcements" },
            { value: "event", label: "Events" }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2",
                activeTab === tab.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="px-4 space-y-2 pb-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification: any) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <Card 
                  key={notification.id} 
                  className={cn(
                    "cursor-pointer transition-colors overflow-hidden",
                    !notification.is_read && "border-l-4 border-l-primary bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              "text-sm font-medium line-clamp-1",
                              !notification.is_read && "font-semibold"
                            )}>
                              {notification.title}
                            </h3>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(notification.created_at), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-sm text-gray-500 text-center">
                {activeTab === "all" 
                  ? "You're all caught up!"
                  : activeTab === "unread"
                  ? "No unread notifications"
                  : `No ${activeTab} notifications`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default Notifications;