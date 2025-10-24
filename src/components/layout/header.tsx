import { Menu, LogOut, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  showUserActions?: boolean;
}

const Header = ({ title = "Mahaveer Bhavan", onMenuClick, showUserActions = true }: HeaderProps) => {
  const { signOut } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
          </div>
        </div>

        {showUserActions && (
          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/notifications')}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/10">
                  <Avatar className="h-10 w-10 border-2 border-orange-500">
                    <AvatarImage src={profile?.photo_url} alt={profile?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-semibold">
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {profile?.full_name && (
                      <p className="font-medium text-white">{profile.full_name}</p>
                    )}
                    {profile?.email && (
                      <p className="w-[200px] truncate text-sm text-white/60">
                        {profile.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="text-white hover:bg-white/10 cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 hover:bg-white/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
};

export { Header };
