import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LandingProtectedRoute } from "@/components/auth/LandingProtectedRoute";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/auth/Auth";
import AdminAuth from "./pages/auth/AdminAuth";
import Events from "./pages/Events";
import Messaging from "./pages/Messaging";
import Donations from "./pages/Donations";
import GalleryNew from "./pages/GalleryNew";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import IDCardPage from "./pages/IDCard";
import AdminSetupPage from "./pages/AdminSetup";
import UnifiedDashboard from "./pages/admin/UnifiedDashboard";
import MemberManagement from "./pages/admin/MemberManagement";
import AdminManagement from "./pages/admin/AdminManagement";
import EventManagement from "./pages/admin/EventManagement";
import CommunicationCenter from "./pages/admin/CommunicationCenter";
import FinancialManagement from "./pages/admin/FinancialManagement";
import ReportsAnalytics from "./pages/admin/ReportsAnalytics";
import SystemSettings from "./pages/admin/SystemSettings";
import Trips from "./pages/Trips";
import TripDetails from "./pages/TripDetails";
import Calendar from "./pages/Calendar";
import TripManagement from "./pages/admin/TripManagement";
import GalleryManagement from "./pages/admin/GalleryManagement";
import AttendanceManagement from "./pages/admin/AttendanceManagement";
import CalendarManagement from "./pages/admin/CalendarManagement";
import ChangePassword from "./pages/ChangePassword";
import DiagnosticPage from "./pages/DiagnosticPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Landing Page - Accessible to Everyone */}
              <Route path="/" element={<Landing />} />
              
              {/* Public Routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/auth" element={<AdminAuth />} />
              
              {/* Password Change Route */}
              <Route path="/change-password" element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              } />
              
              {/* Protected Member Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
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
                  <GalleryNew />
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
              <Route path="/trips" element={
                <ProtectedRoute>
                  <Trips />
                </ProtectedRoute>
              } />
              <Route path="/trips/:id" element={
                <ProtectedRoute>
                  <TripDetails />
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              } />
              <Route path="/admin-setup" element={
                <ProtectedRoute>
                  <AdminSetupPage />
                </ProtectedRoute>
              } />
              
              {/* Diagnostic Route */}
              <Route path="/diagnostic" element={<DiagnosticPage />} />
              
              {/* Protected Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <UnifiedDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute requireAdmin>
                  <UnifiedDashboard />
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
                <ProtectedRoute requireSuperAdmin>
                  <SystemSettings />
                </ProtectedRoute>
              } />
              <Route path="/admin/trips" element={
                <ProtectedRoute requireAdmin>
                  <TripManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/attendance" element={
                <ProtectedRoute requireAdmin>
                  <AttendanceManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/calendar" element={
                <ProtectedRoute requireAdmin>
                  <CalendarManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/gallery" element={
                <ProtectedRoute requireAdmin>
                  <GalleryManagement />
                </ProtectedRoute>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
