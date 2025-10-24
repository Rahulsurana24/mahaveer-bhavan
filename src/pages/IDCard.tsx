import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MobileLayout from '@/components/layout/MobileLayout';
import { IDCard } from '@/components/ui/id-card';
import { Loading } from '@/components/ui/loading';
import { useMemberData } from '@/hooks/useMemberData';

const IDCardPage = () => {
  const { user } = useAuth();
  const { member, loading } = useMemberData();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <MobileLayout title="Digital ID Card">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" text="Loading your ID card..." />
        </div>
      </MobileLayout>
    );
  }

  if (!member) {
    return (
      <MobileLayout title="Digital ID Card">
        <div className="text-center py-8 px-4">
          <p className="text-sm text-gray-600">Member profile not found. Please complete your registration.</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Digital ID Card">
      <div className="px-4 py-4">
        <IDCard member={member} />
      </div>
    </MobileLayout>
  );
};

export default IDCardPage;