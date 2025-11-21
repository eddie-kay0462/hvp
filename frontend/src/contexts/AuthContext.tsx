import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signup: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    role: string;
  }) => Promise<{ error: any }>;
  login: (email: string, password: string) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener for Supabase session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    role: string;
  }) => {
    try {
      // Call backend signup endpoint
      const response = await api.auth.signup({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        role: data.role,
      }) as any;

      if (response.status !== 201) {
        return { error: { message: response.msg || 'Signup failed' } };
      }

      toast.success('Account created! Please check your email to verify your account.');
      return { error: null };
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      return { error: { message: error.message || 'Signup failed' } };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Call backend login endpoint
      const response = await api.auth.login(email, password) as any;

      if (response.status !== 200) {
        return { error: { message: response.msg || 'Login failed' }, data: null };
      }

      // Backend returns Supabase session data
      if (response.data?.session) {
        // Set the session in Supabase client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: response.data.session.access_token,
          refresh_token: response.data.session.refresh_token,
        });

        if (sessionError) {
          console.error('❌ Error setting session:', sessionError);
          return { error: { message: 'Failed to set session' }, data: null };
        }

        // Update local state
        setSession(response.data.session);
        setUser(response.data.user);
        
        toast.success('Logged in successfully!');
        return { error: null, data: response.data };
      }

      return { error: { message: 'No session returned' }, data: null };
    } catch (error: any) {
      console.error('❌ Login error:', error);
      return { error: { message: error.message || 'Login failed' }, data: null };
    }
  };

  const signOut = async () => {
    try {
      // Clear local state FIRST to prevent race conditions
      setUser(null);
      setSession(null);
      
      // Try to call backend logout endpoint (may fail if session is invalid, that's okay)
      try {
        await api.auth.logout();
      } catch (backendError) {
        // Backend logout failed (likely expired session), continue with local logout
        console.log('Backend logout failed (session may be expired), continuing with local logout');
      }
      
      // Sign out from Supabase with scope: 'local' to clear localStorage
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
          // Ignore "Auth session missing" errors - this is expected if session is already cleared/expired
          const isExpectedError = error.message?.includes('Auth session missing') || 
                                  error.message?.includes('session missing');
          if (!isExpectedError) {
            console.error('Supabase signOut error:', error);
          }
        }
      } catch (supabaseError: any) {
        // Ignore "Auth session missing" errors - this is expected when session doesn't exist
        const isExpectedError = supabaseError?.message?.includes('Auth session missing') ||
                               supabaseError?.message?.includes('session missing') ||
                               supabaseError?.name === 'AuthSessionMissingError';
        if (!isExpectedError) {
          console.log('Supabase logout failed, but local state is cleared');
        }
      }
      
      // Also manually clear Supabase storage as a fallback
      try {
        // Clear all Supabase-related localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.log('Error clearing localStorage:', e);
      }
      
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      // Ensure local state is cleared even on unexpected errors
      setUser(null);
      setSession(null);
      // Clear localStorage as fallback
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        // Ignore localStorage errors
      }
      navigate('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signup, login, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
