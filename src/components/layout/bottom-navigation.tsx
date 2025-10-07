import { Home, Calendar, Plane, MessageCircle, User, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "react-router-dom";

interface BottomNavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const navItems: BottomNavItem[] = [
  { icon: <Home className="h-5 w-5" />, label: "Home", path: "/" },
  { icon: <Calendar className="h-5 w-5" />, label: "Events", path: "/events" },
  { icon: <Plane className="h-5 w-5" />, label: "Trips", path: "/trips" },
  { icon: <MessageCircle className="h-5 w-5" />, label: "Messages", path: "/messages" },
  { icon: <User className="h-5 w-5" />, label: "Profile", path: "/profile" },
];

const BottomNavigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center p-2 min-w-0 flex-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn("mb-1", isActive && "text-primary")}>
                {item.icon}
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export { BottomNavigation };