import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { IDCard } from '@/components/ui/id-card';
import { useUserProfile } from '@/hooks/useUserProfile';

const IDCardPage = () => {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold text-center mb-4">Loading...</h1>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  // Mock member data - in real app, this would come from the members table
  const memberData = {
    id: 'K-001',
    full_name: profile.full_name,
    membership_type: 'Karyakarta',
    photo_url: '/placeholder.svg',
    email: profile.email,
    phone: '+91 9876543210'
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center mb-8">Digital ID Card</h1>
        <IDCard member={memberData} />
      </div>
    </ProtectedRoute>
  );
};

export default IDCardPage;