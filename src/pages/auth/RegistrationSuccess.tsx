import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';

const RegistrationSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C1C1C] to-[#2D2D2D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 backdrop-blur-sm rounded-full mb-6 border-2 border-green-500">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Registration Successful!
          </h1>
          <p className="text-lg text-gray-300">
            Welcome to Sree Mahaveer Seva
          </p>
        </div>

        {/* Success Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-6 w-6 text-[#00A36C] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Verify Your Email</h3>
                <p className="text-sm text-gray-400">
                  We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
                </p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-white font-medium text-sm mb-2">What's Next?</h4>
              <ol className="text-sm text-gray-300 space-y-2">
                <li className="flex gap-2">
                  <span className="text-[#00A36C] font-bold">1.</span>
                  <span>Check your email for the verification link</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#00A36C] font-bold">2.</span>
                  <span>Click the link to verify your email address</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#00A36C] font-bold">3.</span>
                  <span>Wait for admin approval (typically 24-48 hours)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#00A36C] font-bold">4.</span>
                  <span>You'll receive a notification when approved</span>
                </li>
              </ol>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-gray-300">
                <strong className="text-yellow-400">Note:</strong> Your account is pending approval. An administrator will review your registration and activate your account soon.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/auth')}
            className="w-full h-12 text-base bg-[#00A36C] hover:bg-[#008F5C] text-white"
          >
            Go to Login
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <Button
            onClick={() => navigate('/auth/welcome')}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white hover:bg-white/10"
          >
            Back to Welcome Screen
          </Button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Didn't receive the email?</p>
          <p className="mt-1">Check your spam folder or contact support</p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
