import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Handle service creation after session is set
  const handleServiceCreation = async () => {
    const pendingService = localStorage.getItem('pendingService');
    if (pendingService) {
      try {
        const serviceData = JSON.parse(pendingService);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          // First, create seller record in sellers table
          const sellerData = {
            title: serviceData.title,
            description: serviceData.description,
            category: serviceData.category,
            default_price: serviceData.price,
            default_delivery_time: serviceData.default_delivery_time,
            express_price: serviceData.express_price,
            express_delivery_time: serviceData.express_delivery_time,
            portfolio: serviceData.portfolio,
          };

          const sellerResponse = await api.sellers.setupSeller(sellerData) as any;

          if (sellerResponse.status !== 200) {
            console.error('Seller setup failed:', sellerResponse);
            toast.warning('Account verified, but seller setup failed. You can add it later.');
          }

          // Then, create service in services table
          const serviceResponse = await api.sellers.createService(sellerData) as any;

          if (serviceResponse.status === 201) {
            toast.success('Account, seller profile, and service created successfully!');
            localStorage.removeItem('pendingService');
          } else {
            toast.warning('Account verified, but service creation failed. You can add it later.');
          }
        }
      } catch (error) {
        console.error('Error creating seller/service:', error);
        toast.warning('Account verified, but seller/service creation failed. You can add it later.');
      }
    }
  };


  // Handle query parameter verification (token_hash format)
  const handleTokenVerification = async (token: string, type: string) => {
    setLoading(true);
    setVerifying(true);
    try {
      const response = await api.auth.verifyEmail(token, type) as any;
      
      if (response.status !== 200) {
        toast.error(response.msg || 'Verification failed');
        setVerifying(false);
        return;
      }

      // If we have a session from verification, set it
      if (response.data?.session) {
        await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });
      }

      // Create service if pending
      await handleServiceCreation();

      toast.success('Email verified successfully!');
      navigate('/services');
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Verification failed');
      setVerifying(false);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  // Check for hash fragments on mount (Supabase redirect format: #access_token=...)
  useEffect(() => {
    const handleEmailVerify = async () => {
      const hash = window.location.hash;

      if (!hash.includes("access_token")) return;

      setVerifying(true);
      setLoading(true);

      // Parse hash correctly (remove the #)
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        toast.error("Invalid verification link");
        setVerifying(false);
        setLoading(false);
        return;
      }

      // Pass tokens directly to setSession
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error(error);
        toast.error("Verification failed");
        setVerifying(false);
        setLoading(false);
        return;
      }

      // Validate session with backend (use backend endpoint)
      try {
        const userResponse = await api.auth.getMe() as any;
        if (userResponse.status !== 200) {
          // Backend validation failed, but continue
        }
      } catch (error) {
        // Backend validation failed, but continue
      }

      await handleServiceCreation();

      toast.success("Email verified!");

      // Clean hash
      window.history.replaceState(null, "", window.location.pathname);

      navigate("/services");
      
      setVerifying(false);
      setLoading(false);
    };

    handleEmailVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for query parameters (token_hash format) - fallback
  useEffect(() => {
    // Only check query params if we don't have a hash
    if (window.location.hash) {
      return; // Hash takes priority
    }

    const token = searchParams.get('token') || searchParams.get('token_hash');
    const type = searchParams.get('type') || 'signup';
    
    if (token) {
      handleTokenVerification(token, type);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Get email from navigation state, user object, or session
  useEffect(() => {
    const getEmail = async () => {
      // First try to get from navigation state (passed from Signup/Login)
      const stateEmail = (location.state as any)?.email;
      if (stateEmail) {
        setEmail(stateEmail);
        return;
      }

      // Then try from user object
      if (user?.email) {
        setEmail(user.email);
        return;
      }

      // Finally try from current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    };
    getEmail();
  }, [user, location.state]);


  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email not found. Please sign up again.');
      navigate('/signup');
      return;
    }

    setLoading(true);
    try {
      const response = await api.auth.resendVerification(email) as any;
      
      if (response.status !== 200) {
        toast.error(response.msg || 'Failed to resend verification email');
        return;
      }

      toast.success('Verification email resent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  // Show verifying state if token is in URL
  if (verifying || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
            <CardDescription className="text-base">
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show waiting for verification link state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="text-base">
            {email 
              ? `We've sent a verification link to ${email}` 
              : 'We\'ve sent a verification link to your email'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Click the verification link in your email to verify your account and sign in.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              The link will redirect you back to this page automatically.
            </p>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email?
            </p>
            <Button
              variant="link"
              onClick={handleResendVerification}
              disabled={loading}
              className="text-primary"
            >
              Resend verification email
            </Button>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Back to login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
