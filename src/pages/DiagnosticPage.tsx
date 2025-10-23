import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DiagnosticPage = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { profile, role, loading: profileLoading, error } = useUserProfile();
  const [dbTest, setDbTest] = useState<any>(null);

  useEffect(() => {
    const testDbConnection = async () => {
      try {
        // Test direct database query
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*, user_roles(*)')
          .eq('email', 'rahulsuranat@gmail.com')
          .single();

        setDbTest({ success: !error, data, error: error?.message });
      } catch (err: any) {
        setDbTest({ success: false, error: err.message });
      }
    };

    testDbConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Authentication Diagnostic</h1>

        {/* Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle>🔐 Authentication Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <strong>Loading:</strong>
              <span className={authLoading ? 'text-yellow-600' : 'text-green-600'}>
                {authLoading ? 'Yes (please wait...)' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <strong>User Authenticated:</strong>
              <span className={user ? 'text-green-600' : 'text-red-600'}>
                {user ? 'Yes ✓' : 'No ✗'}
              </span>
            </div>
            {user && (
              <>
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>User ID:</strong> {user.id}</div>
              </>
            )}
            <div className="flex items-center gap-2">
              <strong>Session Active:</strong>
              <span className={session ? 'text-green-600' : 'text-red-600'}>
                {session ? 'Yes ✓' : 'No ✗'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Status */}
        <Card>
          <CardHeader>
            <CardTitle>👤 User Profile Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <strong>Loading:</strong>
              <span className={profileLoading ? 'text-yellow-600' : 'text-green-600'}>
                {profileLoading ? 'Yes (please wait...)' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <strong>Profile Loaded:</strong>
              <span className={profile ? 'text-green-600' : 'text-red-600'}>
                {profile ? 'Yes ✓' : 'No ✗'}
              </span>
            </div>
            {profile && (
              <>
                <div><strong>Full Name:</strong> {profile.full_name}</div>
                <div><strong>Email:</strong> {profile.email}</div>
                <div><strong>Active:</strong> {profile.is_active ? 'Yes ✓' : 'No ✗'}</div>
                <div><strong>Needs Password Change:</strong> {profile.needs_password_change ? 'Yes' : 'No'}</div>
              </>
            )}
            {error && (
              <div className="text-red-600">
                <strong>Error:</strong> {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Status */}
        <Card>
          <CardHeader>
            <CardTitle>🎭 Role Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <strong>Role Loaded:</strong>
              <span className={role ? 'text-green-600' : 'text-red-600'}>
                {role ? 'Yes ✓' : 'No ✗'}
              </span>
            </div>
            {role ? (
              <>
                <div><strong>Role Name:</strong> <span className="text-lg font-bold text-blue-600">{role.name}</span></div>
                <div><strong>Description:</strong> {role.description}</div>
                <div className="flex items-center gap-2">
                  <strong>Is Admin:</strong>
                  <span className={['admin', 'superadmin', 'management_admin'].includes(role.name) ? 'text-green-600' : 'text-red-600'}>
                    {['admin', 'superadmin', 'management_admin'].includes(role.name) ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <strong>Is Super Admin:</strong>
                  <span className={role.name === 'superadmin' ? 'text-green-600' : 'text-red-600'}>
                    {role.name === 'superadmin' ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
                <div>
                  <strong>Permissions:</strong>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(role.permissions, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div className="text-red-600">
                No role found. This might prevent admin access.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Connection Test */}
        <Card>
          <CardHeader>
            <CardTitle>💾 Database Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dbTest ? (
              <>
                <div className="flex items-center gap-2">
                  <strong>Direct DB Query:</strong>
                  <span className={dbTest.success ? 'text-green-600' : 'text-red-600'}>
                    {dbTest.success ? 'Success ✓' : 'Failed ✗'}
                  </span>
                </div>
                {dbTest.error && (
                  <div className="text-red-600">
                    <strong>Error:</strong> {dbTest.error}
                  </div>
                )}
                {dbTest.data && (
                  <div>
                    <strong>Data Retrieved:</strong>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(dbTest.data, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div>Testing database connection...</div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>💡 Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!user && (
              <div className="text-yellow-700 bg-yellow-50 p-4 rounded">
                ⚠️ You are not logged in. Please sign in with rahulsuranat@gmail.com
              </div>
            )}
            {user && !profile && (
              <div className="text-yellow-700 bg-yellow-50 p-4 rounded">
                ⚠️ User profile not found. The handle_new_user trigger may not have fired.
              </div>
            )}
            {user && profile && !role && (
              <div className="text-yellow-700 bg-yellow-50 p-4 rounded">
                ⚠️ Role not loaded. Check if role_id exists in user_profiles.
              </div>
            )}
            {user && profile && role && role.name !== 'superadmin' && (
              <div className="text-yellow-700 bg-yellow-50 p-4 rounded">
                ⚠️ Your role is '{role.name}' but should be 'superadmin' for full admin access.
              </div>
            )}
            {user && profile && role && role.name === 'superadmin' && (
              <div className="text-green-700 bg-green-50 p-4 rounded">
                ✓ Everything looks good! You should have full admin access.
                <div className="mt-2">
                  Try navigating to: <a href="/admin" className="font-bold underline">/admin</a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiagnosticPage;
