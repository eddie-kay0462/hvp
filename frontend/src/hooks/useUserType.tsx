import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type UserType = 'buyer' | 'seller' | null;

export const useUserType = () => {
  const { user } = useAuth();
  const [userType, setUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) {
        setUserType(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        // Use role directly (buyer or seller)
        const role = data?.role || null;
        setUserType(role as any);
      } catch (error) {
        console.error('Error fetching user type:', error);
        setUserType(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserType();
  }, [user]);

  const canListServices = userType === 'seller';
  const canBookServices = userType === 'buyer';

  return { userType, loading, canListServices, canBookServices };
};
