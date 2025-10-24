import { Link, useLocation } from "react-router-dom";
import { Home, MessageCircle, PlusSquare, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MobileBottomNav = () => {
  const location = useLocation();

  // Fetch unread notifications count
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return 0;

      const { data, error } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .eq('is_read', false);

      return data?.length || 0;
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const navItems = [
    {
      path: "/dashboard",
      icon: Home,
      label: "Home",
      match: ["/dashboard", "/"]
    },
    {
      path: "/messages",
      icon: MessageCircle,
      label: "Chats",
      match: ["/messages", "/chat"]
    },
    {
      path: "/create-post",
      icon: PlusSquare,
      label: "Create",
      match: ["/create-post", "/create"]
    },
    {
      path: "/notifications",
      icon: Bell,
      label: "Notifications",
      match: ["/notifications"],
      badge: unreadCount
    },
    {
      path: "/profile",
      icon: User,
      label: "Profile",
      match: ["/profile", "/me"]
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#1C1C1C] via-[#252525] to-[#252525] border-t border-white/10 md:hidden shadow-2xl">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match.some(path =>
            location.pathname === path || location.pathname.startsWith(path)
          );

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full relative transition-all duration-200",
                isActive
                  ? "text-[#B8860B]"
                  : "text-gray-400 hover:text-gray-300"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all",
                    isActive && "fill-current drop-shadow-lg"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.badge && item.badge > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-[#00A36C] border-2 border-[#1C1C1C] text-white font-bold shadow-lg"
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-xs mt-1 transition-all",
                isActive ? "font-bold text-[#B8860B]" : "font-medium text-gray-400"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-[#B8860B] to-transparent rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
