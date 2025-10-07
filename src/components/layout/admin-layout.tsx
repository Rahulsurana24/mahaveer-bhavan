import { useState } from "react";
import { Header } from "./header";
import { AdminSidebar } from "./admin-sidebar";
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  Calendar, 
  Plane,
  MessageSquare, 
  DollarSign, 
  BarChart3, 
  Settings 
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Users, label: "Members", path: "/admin/members" },
  { icon: UserCog, label: "Admins", path: "/admin/admins" },
  { icon: Calendar, label: "Events", path: "/admin/events" },
  { icon: Plane, label: "Trips", path: "/admin/trips" },
  { icon: MessageSquare, label: "Communications", path: "/admin/communications" },
  { icon: DollarSign, label: "Finances", path: "/admin/finances" },
  { icon: BarChart3, label: "Reports", path: "/admin/reports" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar navItems={adminNavItems} />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full">
            <AdminSidebar navItems={adminNavItems} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <Header 
          title={title || "Admin Panel"} 
          onMenuClick={() => setSidebarOpen(true)}
          showUserActions={false}
        />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export { AdminLayout };