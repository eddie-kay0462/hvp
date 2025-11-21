import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'buyer' | 'seller';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;

      if (!user) {
        navigate('/login');
        return;
      }

      if (requiredRole) {
        setCheckingRole(true);
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile?.role !== requiredRole) {
            navigate('/');
            return;
          }
        } catch (error) {
          console.error('Error checking role:', error);
          navigate('/');
        } finally {
          setCheckingRole(false);
        }
      }
    };

    checkAccess();
  }, [user, loading, navigate, requiredRole]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
