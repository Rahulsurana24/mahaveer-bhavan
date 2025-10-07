import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/main-layout';
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
      <MainLayout title="Digital ID Card">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" text="Loading your ID card..." />
        </div>
      </MainLayout>
    );
  }

  if (!member) {
    return (
      <MainLayout title="Digital ID Card">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Member profile not found. Please complete your registration.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Digital ID Card">
      <div className="container mx-auto px-4 py-8">
        <IDCard member={member} />
      </div>
    </MainLayout>
  );
};

export default IDCardPage;