import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, LogIn, Users, Heart, Calendar, Gift } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Loading } from '@/components/ui/loading';

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D]">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  // Redirect authenticated users
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] flex flex-col">
      {/* Header */}
      <div className="w-full py-6 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full mb-6 border-2 border-[#00A36C]">
            <img
              src="/lovable-uploads/b6ff16cc-cf72-4a45-807f-fe1e91fcd72d.png"
              alt="Sree Mahaveer Seva Logo"
              className="w-20 h-20 rounded-full"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Sree Mahaveer Seva
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Connecting the Community of<br />
            Sree Mahaveer Swami Charitable Trust
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-6">
          {/* Primary Actions */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6 space-y-4">
              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full h-14 text-lg bg-[#00A36C] hover:bg-[#008F5C] text-white shadow-lg"
                size="lg"
              >
                <LogIn className="mr-3 h-6 w-6" />
                Login (Existing Member)
              </Button>

              <Button
                onClick={() => navigate('/auth/register')}
                className="w-full h-14 text-lg bg-white hover:bg-gray-100 text-[#1C1C1C] shadow-lg"
                size="lg"
                variant="outline"
              >
                <UserPlus className="mr-3 h-6 w-6" />
                Register (New Member)
              </Button>
            </CardContent>
          </Card>

          {/* Features Highlight */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-[#00A36C] mx-auto mb-2" />
                <p className="text-sm text-gray-300">Member Network</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 text-[#00A36C] mx-auto mb-2" />
                <p className="text-sm text-gray-300">Events & Trips</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4 text-center">
                <Heart className="h-8 w-8 text-[#00A36C] mx-auto mb-2" />
                <p className="text-sm text-gray-300">Donations</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="p-4 text-center">
                <Gift className="h-8 w-8 text-[#00A36C] mx-auto mb-2" />
                <p className="text-sm text-gray-300">Gallery & Media</p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Access */}
          <div className="text-center">
            <Button
              onClick={() => navigate('/admin/auth')}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              Administrator Access →
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full py-6 px-4 text-center text-gray-400 text-sm">
        <p>© 2024 Sree Mahaveer Swami Charitable Trust</p>
        <p className="mt-1">All rights reserved</p>
      </div>
    </div>
  );
};

export default Welcome;
