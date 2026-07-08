import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  // Two link formats can land here, depending on the Supabase email template:
  // - #access_token=...&type=recovery (Supabase's default confirmation-URL redirect)
  // - ?token_hash=...&type=recovery (our own template, linking straight to this domain)
  useEffect(() => {
    const establishRecoverySession = async () => {
      const hash = window.location.hash;

      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          window.history.replaceState(null, '', window.location.pathname);
          if (!error) {
            setReady(true);
            return;
          }
        }
      }

      const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (!error) {
          setReady(true);
          return;
        }
      }

      // No tokens in the URL — maybe Supabase already established the session
      // (e.g. page was reloaded after a token was consumed once).
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
      } else {
        setLinkInvalid(true);
      }
    };

    establishRecoverySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) return 'Password must be at least 6 characters long';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/\d/.test(password)) return 'Password must contain at least one digit';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Password must contain at least one symbol';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { password_updated_after_requirements_change: true },
      });

      if (error) throw error;

      toast.success('Password updated! You can now sign in.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (linkInvalid) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center bg-background px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Link expired or invalid</CardTitle>
              <CardDescription>Request a new password reset link and try again.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/forgot-password')}>
                Request a new link
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">Set a new password</CardTitle>
            <CardDescription className="text-center">
              Choose a new password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="h-12"
                  required
                />
                {newPassword && <PasswordRequirements password={newPassword} className="mt-2" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="h-12"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
              >
                <KeyRound className="mr-2 h-5 w-5" />
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
