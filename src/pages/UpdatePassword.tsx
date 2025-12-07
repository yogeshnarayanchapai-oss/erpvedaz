import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = updatePasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });

      if (error) {
        const anyErr = error as any;
        if (anyErr?.status === 401) {
          const msg = 'Session expired. Please request a new password reset link.';
          setErrorMessage(msg);
          toast.error(msg);
        } else {
          const msg = error.message || 'Failed to update password.';
          setErrorMessage(msg);
          toast.error(msg);
        }
        return;
      }

      setSuccess(true);
      toast.success('Your password has been updated successfully');
    } catch {
      const msg = 'Something went wrong. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Set a new password
            </CardTitle>
            <CardDescription>
              Choose a strong password to secure your Vakari account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-sm">
                <p>Your password has been updated successfully.</p>
                <p>
                  You can now{' '}
                  <Link to="/auth" className="text-primary hover:underline">
                    log in with your new password
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="rounded-md bg-destructive/10 border border-destructive px-3 py-2 text-sm text-destructive">
                    {errorMessage}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update password
                </Button>
                <div className="text-xs text-muted-foreground mt-2">
                  If you see a "Session expired" error, please go back to{' '}
                  <Link to="/auth/forgot-password" className="text-primary hover:underline">
                    Forgot password
                  </Link>{' '}
                  and request a new reset link.
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
