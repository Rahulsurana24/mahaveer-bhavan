import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminSetup } from '@/components/admin/AdminSetup';
import { SuperAdminInstructions } from '@/components/admin/SuperAdminInstructions';

const AdminSetupPage = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Admin Panel Setup</h1>
            <p className="text-muted-foreground">
              Set up admin users to access the administrative features
            </p>
          </div>

          <SuperAdminInstructions />
          
          <AdminSetup />

          <Card className="p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold mb-4">How to Access Admin Panel:</h3>
            <div className="space-y-3 text-sm">
              <div className="step">
                <span className="font-medium">1. Create Admin User:</span>
                <p className="text-muted-foreground ml-4">
                  Use the form above to assign admin role to any existing user
                </p>
              </div>
              <div className="step">
                <span className="font-medium">2. Login with Admin Account:</span>
                <p className="text-muted-foreground ml-4">
                  Admin users login through the same /auth page
                </p>
              </div>
              <div className="step">
                <span className="font-medium">3. Access Admin Routes:</span>
                <p className="text-muted-foreground ml-4">
                  Navigate to /admin/dashboard after logging in
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold mb-4">Admin Panel URLs:</h3>
            <div className="space-y-2 text-sm font-mono">
              <div>/admin/dashboard - Main admin dashboard</div>
              <div>/admin/members - Member management</div>
              <div>/admin/events - Event management</div>
              <div>/admin/communications - Communication center</div>
              <div>/admin/finances - Financial management</div>
              <div>/admin/reports - Reports & analytics</div>
              <div>/admin/settings - System settings</div>
              <div>/admin/admins - Admin management (Super Admin only)</div>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminSetupPage;