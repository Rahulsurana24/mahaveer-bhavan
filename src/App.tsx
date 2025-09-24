import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Events from "./pages/Events";
import Messaging from "./pages/Messaging";
import Donations from "./pages/Donations";
import Gallery from "./pages/Gallery";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MemberManagement from "./pages/admin/MemberManagement";
import AdminManagement from "./pages/admin/AdminManagement";
import EventManagement from "./pages/admin/EventManagement";
import CommunicationCenter from "./pages/admin/CommunicationCenter";
import FinancialManagement from "./pages/admin/FinancialManagement";
import ReportsAnalytics from "./pages/admin/ReportsAnalytics";
import SystemSettings from "./pages/admin/SystemSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Member Routes */}
          <Route path="/events" element={<Events />} />
          <Route path="/messages" element={<Messaging />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/members" element={<MemberManagement />} />
          <Route path="/admin/admins" element={<AdminManagement />} />
          <Route path="/admin/events" element={<EventManagement />} />
          <Route path="/admin/communications" element={<CommunicationCenter />} />
          <Route path="/admin/finances" element={<FinancialManagement />} />
          <Route path="/admin/reports" element={<ReportsAnalytics />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
