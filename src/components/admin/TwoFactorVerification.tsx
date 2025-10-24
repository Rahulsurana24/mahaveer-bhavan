import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  AlertCircle,
  Key,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface TwoFactorVerificationProps {
  isOpen: boolean;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorVerification = ({
  isOpen,
  userId,
  onSuccess,
  onCancel,
}: TwoFactorVerificationProps) => {
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  // Verify TOTP code
  const verifyCodeMutation = useMutation({
    mutationFn: async (verificationCode: string) => {
      // Check if account is locked
      const { data: lockoutCheck, error: lockoutError } = await supabase
        .rpc('check_2fa_lockout', { p_user_id: userId });

      if (lockoutError) throw lockoutError;

      if (lockoutCheck) {
        setIsLocked(true);
        throw new Error('Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.');
      }

      // In a real implementation, this would call a server function to verify the TOTP code
      // For now, we'll simulate verification
      // TODO: Implement server-side TOTP verification

      // Simulated verification (REPLACE WITH ACTUAL SERVER CALL)
      const isValid = /^\d{6}$/.test(verificationCode);

      if (!isValid) {
        // Record failed attempt
        await supabase.rpc('record_2fa_failure', { p_user_id: userId });
        setAttempts(prev => prev + 1);
        throw new Error('Invalid verification code. Please try again.');
      }

      // Record successful verification
      await supabase.rpc('record_2fa_success', { p_user_id: userId });

      return true;
    },
    onSuccess: () => {
      toast({
        title: '✓ Verification Successful',
        description: 'Access granted',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });

      if (attempts >= 4) {
        setIsLocked(true);
      }
    },
  });

  // Verify backup code
  const verifyBackupCodeMutation = useMutation({
    mutationFn: async (backupCodeToVerify: string) => {
      // In a real implementation, this would:
      // 1. Hash the provided backup code
      // 2. Check if it matches any unused backup code
      // 3. Mark the code as used if valid
      // TODO: Implement server-side backup code verification

      // Simulated verification (REPLACE WITH ACTUAL SERVER CALL)
      const isValid = /^[A-F0-9]{8}$/.test(backupCodeToVerify.toUpperCase());

      if (!isValid) {
        throw new Error('Invalid backup code. Please check and try again.');
      }

      // Log backup code usage
      await supabase.rpc('log_2fa_action', {
        p_user_id: userId,
        p_action: 'backup_code_used',
      });

      return true;
    },
    onSuccess: () => {
      toast({
        title: '✓ Backup Code Accepted',
        description: 'Access granted. Consider regenerating your backup codes.',
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: 'Invalid Backup Code',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleVerify = () => {
    if (useBackupCode) {
      if (backupCode.length === 8) {
        verifyBackupCodeMutation.mutate(backupCode);
      }
    } else {
      if (code.length === 6) {
        verifyCodeMutation.mutate(code);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !verifyCodeMutation.isPending && onCancel()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[400px] bg-[#1C1C1C] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#00A36C]" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLocked ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-400">
                  <p className="font-semibold mb-1">Account Temporarily Locked</p>
                  <p>
                    Too many failed verification attempts. Please try again in 15 minutes.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {!useBackupCode ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Verification Code</Label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyPress={handleKeyPress}
                      className="text-center text-2xl font-mono tracking-wider bg-[#252525] border-white/10 text-white"
                      maxLength={6}
                      autoFocus
                      disabled={verifyCodeMutation.isPending}
                    />
                  </div>

                  {attempts > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-400">
                          {attempts === 1 && 'Incorrect code. Please try again.'}
                          {attempts > 1 && attempts < 5 && `${attempts} failed attempts. ${5 - attempts} remaining before temporary lockout.`}
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="link"
                    onClick={() => setUseBackupCode(true)}
                    className="text-[#00A36C] hover:text-[#00A36C]/80 p-0 h-auto"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Use backup code instead
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Backup Code</Label>
                    <Input
                      type="text"
                      placeholder="XXXXXXXX"
                      value={backupCode}
                      onChange={e => setBackupCode(e.target.value.replace(/[^A-F0-9]/gi, '').slice(0, 8).toUpperCase())}
                      onKeyPress={handleKeyPress}
                      className="text-center text-xl font-mono tracking-wider bg-[#252525] border-white/10 text-white uppercase"
                      maxLength={8}
                      autoFocus
                      disabled={verifyBackupCodeMutation.isPending}
                    />
                    <p className="text-xs text-gray-400">
                      Each backup code can only be used once
                    </p>
                  </div>

                  <Button
                    variant="link"
                    onClick={() => setUseBackupCode(false)}
                    className="text-[#00A36C] hover:text-[#00A36C]/80 p-0 h-auto"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Use authenticator code instead
                  </Button>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={verifyCodeMutation.isPending || verifyBackupCodeMutation.isPending}
                  className="flex-1 bg-[#252525] border-white/10 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={
                    (useBackupCode ? backupCode.length !== 8 : code.length !== 6) ||
                    verifyCodeMutation.isPending ||
                    verifyBackupCodeMutation.isPending
                  }
                  className="flex-1 bg-[#00A36C] hover:bg-[#00A36C]/90"
                >
                  {(verifyCodeMutation.isPending || verifyBackupCodeMutation.isPending)
                    ? 'Verifying...'
                    : 'Verify'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
