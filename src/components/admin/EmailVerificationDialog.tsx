import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useVerifyEmail, useResendOTP } from '@/hooks/useRBAC';
import { Mail, RefreshCw } from 'lucide-react';

interface EmailVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
}

export function EmailVerificationDialog({ open, onOpenChange, userId, email }: EmailVerificationDialogProps) {
  const [otp, setOtp] = useState('');
  const verifyEmail = useVerifyEmail();
  const resendOTP = useResendOTP();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyEmail.mutateAsync({ userId, otp });
    onOpenChange(false);
  };

  const handleResend = async () => {
    await resendOTP.mutateAsync(userId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Verify Your Email
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              A 6-digit verification code has been sent to:
            </p>
            <p className="font-medium mt-1">{email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              required
            />
            <p className="text-xs text-muted-foreground">
              Code expires in 15 minutes
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={resendOTP.isPending}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${resendOTP.isPending ? 'animate-spin' : ''}`} />
              Resend Code
            </Button>
            <Button
              type="submit"
              disabled={otp.length !== 6 || verifyEmail.isPending}
              className="flex-1"
            >
              {verifyEmail.isPending ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}