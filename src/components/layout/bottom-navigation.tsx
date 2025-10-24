import { Home, Calendar, Plane, MessageCircle, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";

interface BottomNavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: BottomNavItem[] = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: ImageIcon, label: "Gallery", path: "/gallery" },
  { icon: Plane, label: "Trips", path: "/trips" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
];

const BottomNavigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="flex items-center justify-around py-3 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
                          (item.path === "/dashboard" && location.pathname === "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center p-2 min-w-0 flex-1 text-xs transition-all relative",
                isActive
                  ? "text-white"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              <motion.div
                className="relative"
                whileTap={{ scale: 0.9 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur-xl opacity-50"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className={cn(
                  "relative p-2 rounded-2xl transition-all",
                  isActive && "bg-gradient-to-r from-orange-500 to-red-600"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
              </motion.div>
              <span className={cn(
                "mt-1 truncate font-medium",
                isActive && "text-white"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export { BottomNavigation };
