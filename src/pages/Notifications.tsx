import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Info,
  AlertCircle,
  CheckCircle,
  Heart,
  CreditCard,
  MapPin,
  ChevronRight,
  X,
  Download,
  ExternalLink
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useMemberData } from "@/hooks/useMemberData";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { member } = useMemberData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications from database
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', member?.id],
    queryFn: async () => {
      if (!member) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', member.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!member
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!member) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', member.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "All marked as read",
        description: "All notifications have been marked as read"
      });
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
    setSelectedNotification(notification);
    setIsDetailsOpen(true);

    // Mark as read
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleAction = (action: string, link?: string) => {
    setIsDetailsOpen(false);
    if (link) {
      navigate(link);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      event: Calendar,
      trip: MapPin,
      donation: DollarSign,
      message: MessageSquare,
      system: Settings,
      announcement: Bell,
      reminder: Clock,
      payment: CreditCard,
      profile: Users,
      general: Info,
      success: CheckCircle,
      warning: AlertCircle
    };

    return iconMap[type] || Bell;
  };

  const getNotificationColor = (type: string) => {
    const colorMap: Record<string, string> = {
      event: '#00A36C',
      trip: '#B8860B',
      donation: '#00A36C',
      message: '#B8860B',
      system: '#6B7280',
      announcement: '#00A36C',
      reminder: '#B8860B',
      payment: '#00A36C',
      profile: '#B8860B',
      general: '#6B7280',
      success: '#00A36C',
      warning: '#EF4444'
    };

    return colorMap[type] || '#00A36C';
  };

  const getActionButton = (notification: any) => {
    const type = notification.type;
    const metadata = notification.metadata || {};

    if (type === 'event' || type === 'reminder') {
      return {
        label: 'View Event Details',
        icon: Calendar,
        link: metadata.event_id ? `/events` : null
      };
    }

    if (type === 'trip') {
      return {
        label: 'View Trip Details',
        icon: MapPin,
        link: metadata.trip_id ? `/trips/${metadata.trip_id}` : '/trips'
      };
    }

    if (type === 'donation' || type === 'payment') {
      return {
        label: 'View Donation History',
        icon: DollarSign,
        link: '/donations'
      };
    }

    if (type === 'profile') {
      return {
        label: 'Go to Profile',
        icon: Users,
        link: '/profile'
      };
    }

    if (type === 'message') {
      return {
        label: 'View Messages',
        icon: MessageSquare,
        link: '/messages'
      };
    }

    return null;
  };

  const filteredNotifications = () => {
    switch (activeTab) {
      case 'all':
        return notifications;
      case 'unread':
        return notifications.filter(n => !n.is_read);
      case 'announcements':
        return notifications.filter(n => n.type === 'announcement');
      case 'reminders':
        return notifications.filter(n => n.type === 'reminder');
      default:
        return notifications;
    }
  };

  const displayNotifications = filteredNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <MobileLayout title="Notifications">
        <div className="flex justify-center items-center min-h-screen bg-[#1C1C1C]">
          <Loading size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title={`Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
      headerRight={
        unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="h-9 text-[#B8860B] hover:bg-white/5"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark All
          </Button>
        )
      }
    >
      <div className="min-h-screen bg-[#1C1C1C]">
        {/* Filter Tabs */}
        <div className="sticky top-14 z-30 bg-gradient-to-b from-[#252525] to-[#1C1C1C] border-b border-white/10 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { value: "all", label: "All", badge: notifications.length },
              { value: "unread", label: "Unread", badge: unreadCount },
              { value: "announcements", label: "Announcements" },
              { value: "reminders", label: "Reminders" }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
                  activeTab === tab.value
                    ? "bg-gradient-to-r from-[#00A36C] to-[#008556] text-white shadow-lg"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                )}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <Badge className="bg-[#B8860B] text-white h-5 min-w-5 px-1.5 text-xs">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="px-4 py-6 space-y-3">
          {displayNotifications.length > 0 ? (
            <AnimatePresence>
              {displayNotifications.map((notification: any, index) => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={cn(
                        "bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10 cursor-pointer hover:border-[#00A36C]/30 transition-all overflow-hidden",
                        !notification.is_read && "border-l-4 border-l-[#B8860B]"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div
                            className="p-2.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: `${iconColor}20`,
                            }}
                          >
                            <Icon
                              className="h-5 w-5"
                              style={{ color: iconColor }}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <h3
                                  className={cn(
                                    "text-sm line-clamp-1",
                                    !notification.is_read
                                      ? "font-bold text-white"
                                      : "font-semibold text-gray-300"
                                  )}
                                >
                                  {notification.title}
                                </h3>
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-[#B8860B] rounded-full flex-shrink-0 animate-pulse" />
                                )}
                              </div>

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(notification.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {/* Message Preview */}
                            <p className={cn(
                              "text-sm line-clamp-2 mb-2",
                              !notification.is_read ? "text-gray-300" : "text-gray-400"
                            )}>
                              {notification.message}
                            </p>

                            {/* Timestamp */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {/* Chevron */}
                          <ChevronRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Bell className="h-16 w-16 text-gray-600 mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-gray-400 text-sm text-center">
                {activeTab === "all"
                  ? "You're all caught up! No notifications at the moment."
                  : activeTab === "unread"
                  ? "No unread notifications"
                  : `No ${activeTab} notifications`}
              </p>
            </div>
          )}
        </div>

        {/* Detailed Notification Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="bg-[#252525] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                {selectedNotification && (
                  <>
                    <div
                      className="p-2.5 rounded-full"
                      style={{
                        backgroundColor: `${getNotificationColor(selectedNotification.type)}20`,
                      }}
                    >
                      {(() => {
                        const Icon = getNotificationIcon(selectedNotification.type);
                        return (
                          <Icon
                            className="h-5 w-5"
                            style={{ color: getNotificationColor(selectedNotification.type) }}
                          />
                        );
                      })()}
                    </div>
                    <div className="flex-1">
                      <DialogTitle className="text-white text-lg">{selectedNotification.title}</DialogTitle>
                      <DialogDescription className="text-gray-400 text-xs">
                        {formatDistanceToNow(new Date(selectedNotification.created_at), { addSuffix: true })}
                      </DialogDescription>
                    </div>
                  </>
                )}
              </div>
            </DialogHeader>

            {selectedNotification && (
              <div className="space-y-4">
                {/* Source/Sender */}
                <Card className="bg-gradient-to-r from-[#00A36C]/10 to-[#B8860B]/10 border-[#00A36C]/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-[#00A36C]" />
                      <p className="text-sm text-gray-300">
                        Sree Mahaveer Swami Charitable Trust Administration
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Full Message Content */}
                <div className="space-y-2">
                  <h4 className="text-white font-semibold text-sm">Message</h4>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedNotification.message}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                {(() => {
                  const action = getActionButton(selectedNotification);
                  if (!action) return null;

                  const ActionIcon = action.icon;

                  return (
                    <Button
                      onClick={() => handleAction(action.label, action.link)}
                      className="w-full bg-gradient-to-r from-[#00A36C] to-[#008556] hover:from-[#008556] hover:to-[#00A36C] text-white"
                    >
                      <ActionIcon className="h-4 w-4 mr-2" />
                      {action.label}
                    </Button>
                  );
                })()}

                {/* Close Button */}
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                  className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default Notifications;
