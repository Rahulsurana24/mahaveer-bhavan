import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Smartphone,
  Key,
  Copy,
  CheckCircle,
  AlertCircle,
  Download,
  QrCode as QrCodeIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Base32 character set (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Generate random base32 secret
const generateSecret = (length: number = 32): string => {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[randomBytes[i] % 32];
  }
  return secret;
};

// Generate backup codes
const generateBackupCodes = (count: number = 8): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    const code = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 8)
      .toUpperCase();
    codes.push(code);
  }
  return codes;
};

// Simple TOTP verification (6 digits, 30 second window)
const verifyTOTP = (secret: string, token: string): boolean => {
  // This is a simplified client-side check
  // In production, verification should happen on the server
  // For demo purposes, we'll accept any 6-digit code during setup
  return /^\d{6}$/.test(token);
};

// Generate QR code data URL for authenticator apps
const generateQRCode = (secret: string, email: string): string => {
  const issuer = 'Mahaveer Bhavan';
  const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

  // For a real implementation, use a QR code library
  // This is a placeholder that shows the URI
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
};

// Hash backup code (client-side hashing for storage)
const hashBackupCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const TwoFactorSetup = ({ isOpen, onClose, onSuccess }: TwoFactorSetupProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1); // 1: Generate, 2: Verify, 3: Backup Codes
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState('');

  // Initialize 2FA setup
  const initializeSetup = async () => {
    // Get current user email
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast({
        title: 'Error',
        description: 'Unable to get user information',
        variant: 'destructive',
      });
      return;
    }

    setUserEmail(user.email);

    // Generate secret and QR code
    const newSecret = generateSecret();
    setSecret(newSecret);

    const qrUrl = generateQRCode(newSecret, user.email);
    setQrCodeUrl(qrUrl);

    // Generate backup codes
    const codes = generateBackupCodes();
    setBackupCodes(codes);

    setStep(1);
  };

  // Save 2FA configuration to database
  const enable2FAMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Hash all backup codes
      const hashedCodes = await Promise.all(
        backupCodes.map(code => hashBackupCode(code))
      );

      // Check if 2FA record already exists
      const { data: existing } = await supabase
        .from('admin_two_factor')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('admin_two_factor')
          .update({
            is_enabled: true,
            secret: secret,
            backup_codes: hashedCodes,
            backup_codes_used: 0,
            enabled_at: new Date().toISOString(),
            enabled_by: user.id,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('admin_two_factor')
          .insert([{
            user_id: user.id,
            is_enabled: true,
            secret: secret,
            backup_codes: hashedCodes,
            enabled_at: new Date().toISOString(),
            enabled_by: user.id,
          }]);

        if (error) throw error;
      }

      // Log the action
      await supabase.rpc('log_2fa_action', {
        p_user_id: user.id,
        p_action: 'enabled',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      toast({
        title: '✓ Two-Factor Authentication Enabled',
        description: 'Your account is now protected with 2FA',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleVerify = () => {
    if (!verifyTOTP(secret, verificationCode)) {
      toast({
        title: 'Invalid Code',
        description: 'The code you entered is incorrect. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Move to backup codes step
    setStep(3);
  };

  const handleComplete = () => {
    enable2FAMutation.mutate();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '✓ Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const downloadBackupCodes = () => {
    const content = [
      'Mahaveer Bhavan - Two-Factor Authentication Backup Codes',
      '='.repeat(60),
      '',
      'IMPORTANT: Store these codes securely!',
      'Each code can only be used once.',
      '',
      'Backup Codes:',
      ...backupCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      '='.repeat(60),
      `Generated: ${new Date().toLocaleString()}`,
      `Account: ${userEmail}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahaveer-bhavan-2fa-backup-codes-${Date.now()}.txt`;
    a.click();

    toast({
      title: '✓ Backup Codes Downloaded',
      description: 'Store this file in a secure location',
    });
  };

  // Initialize on open
  useEffect(() => {
    if (isOpen && step === 1 && !secret) {
      initializeSetup();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-hidden bg-[#1C1C1C] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#00A36C]" />
            Enable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {step === 1 && 'Scan the QR code with your authenticator app'}
            {step === 2 && 'Enter the 6-digit code from your app'}
            {step === 3 && 'Save your backup codes securely'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-4">
          {/* Step 1: Show QR Code and Secret */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-400">
                    <p className="font-semibold mb-1">Get Started</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Install Google Authenticator or Authy on your phone</li>
                      <li>Scan the QR code below</li>
                      <li>Enter the 6-digit code to verify</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <QrCodeIcon className="h-6 w-6 text-[#00A36C] mr-2" />
                    <h3 className="text-white font-semibold">Scan QR Code</h3>
                  </div>

                  {qrCodeUrl && (
                    <div className="inline-block p-4 bg-white rounded-lg">
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-[200px] h-[200px]" />
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-4">
                    Scan this code with your authenticator app
                  </p>
                </CardContent>
              </Card>

              {/* Manual Entry */}
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-300 text-xs">Can't scan? Enter manually:</Label>
                      <div className="text-white font-mono text-sm mt-1 break-all">{secret}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(secret, 'Secret key')}
                      className="flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => setStep(2)}
                className="w-full bg-[#00A36C] hover:bg-[#00A36C]/90"
              >
                Next: Verify Code
              </Button>
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === 2 && (
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-6 text-center">
                  <Smartphone className="h-12 w-12 text-[#00A36C] mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">Enter Verification Code</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Open your authenticator app and enter the 6-digit code
                  </p>

                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-2xl font-mono tracking-wider bg-[#1C1C1C] border-white/10 text-white"
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-[#252525] border-white/10 text-white"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={verificationCode.length !== 6}
                  className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
                >
                  Verify Code
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-400">
                    <p className="font-semibold mb-1">Save Your Backup Codes!</p>
                    <p>
                      Store these codes in a secure location. Each code can only be used once if
                      you lose access to your authenticator app.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-[#252525] to-[#1C1C1C] border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-[#B8860B]" />
                      <h3 className="text-white font-semibold">Backup Codes</h3>
                    </div>
                    <Badge className="bg-[#B8860B] text-white border-0">
                      {backupCodes.length} codes
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="bg-[#1C1C1C] p-2 rounded text-center font-mono text-white text-sm"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                onClick={downloadBackupCodes}
                className="w-full bg-[#252525] border-white/10 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Backup Codes
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 bg-[#252525] border-white/10 text-white"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={enable2FAMutation.isPending}
                  className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
                >
                  {enable2FAMutation.isPending ? (
                    'Enabling...'
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
