import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/auth/Auth";
import Events from "./pages/Events";
import Messaging from "./pages/Messaging";
import Donations from "./pages/Donations";
import Gallery from "./pages/Gallery";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import IDCardPage from "./pages/IDCard";
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
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Member Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <Messaging />
              </ProtectedRoute>
            } />
            <Route path="/donations" element={
              <ProtectedRoute>
                <Donations />
              </ProtectedRoute>
            } />
            <Route path="/gallery" element={
              <ProtectedRoute>
                <Gallery />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/id-card" element={
              <ProtectedRoute>
                <IDCardPage />
              </ProtectedRoute>
            } />
            
            {/* Protected Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/members" element={
              <ProtectedRoute requireAdmin>
                <MemberManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/admins" element={
              <ProtectedRoute requireSuperAdmin>
                <AdminManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/events" element={
              <ProtectedRoute requireAdmin>
                <EventManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/communications" element={
              <ProtectedRoute requireAdmin>
                <CommunicationCenter />
              </ProtectedRoute>
            } />
            <Route path="/admin/finances" element={
              <ProtectedRoute requireAdmin>
                <FinancialManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute requireAdmin>
                <ReportsAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requireAdmin>
                <SystemSettings />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
