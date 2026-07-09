import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { PasswordChangeModal } from '@/components/PasswordChangeModal';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }

    setLoading(true);

    const { error, data } = await login(email, password);

    if (error) {
      toast.error(error.message || 'Login failed');
      setLoading(false);
    } else {
      // Check if password update is required
      if (data?.requiresPasswordUpdate) {
        setShowPasswordModal(true);
      } else {
        // Login successful, navigate to services page
        navigate('/services');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">
              Welcome to <span className="text-primary">Hustle Village</span>
            </CardTitle>
            <CardDescription className="text-center">
              Sign in with your email to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <PasswordInput
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-12"
                  required
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto min-h-[44px] font-normal text-sm text-muted-foreground"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
              >
                <Mail className="mr-2 h-5 w-5" />
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <GoogleSignInButton label="Continue with Google" />
            <div className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 min-h-[44px] font-normal"
                  onClick={() => navigate('/signup')}
                >
                  Sign up
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
      <PasswordChangeModal
        open={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          navigate('/services'); // Allow them to continue
        }}
        onSuccess={() => {
          setShowPasswordModal(false);
          navigate('/services');
        }}
      />
    </div>
  );
};

export default Login;
