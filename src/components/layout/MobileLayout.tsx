import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MoreVertical, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileBottomNav from "./MobileBottomNav";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showMenu?: boolean;
  headerRight?: ReactNode;
  className?: string;
  hideBottomNav?: boolean;
}

const MobileLayout = ({
  children,
  title,
  showBack = false,
  showSearch = false,
  showMenu = false,
  headerRight,
  className,
  hideBottomNav = false
}: MobileLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3 flex-1">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {title && (
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showSearch && (
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Search className="h-5 w-5" />
              </Button>
            )}
            {headerRight}
            {showMenu && (
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto",
        !hideBottomNav && "pb-16",
        className
      )}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideBottomNav && <MobileBottomNav />}
    </div>
  );
};

export default MobileLayout;
