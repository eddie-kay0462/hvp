import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [errored, setErrored] = useState(false);
  const handled = useRef(false);

  useEffect(() => {
    const finishSignIn = async (userId: string, user: any) => {
      if (handled.current) return;
      handled.current = true;

      try {
        // Google sign-in creates the auth.users row directly — this app creates
        // the matching profiles row itself (no DB trigger does it), so first-time
        // Google sign-ins need one created here, same as email signup does on the backend.
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();

        if (!existingProfile) {
          const meta = user.user_metadata || {};
          const fullName: string = meta.full_name || meta.name || '';
          const [firstName, ...rest] = fullName.split(' ');

          const { error: profileError } = await supabase.from('profiles').insert({
            id: userId,
            email: user.email || null,
            first_name: meta.given_name || firstName || null,
            last_name: meta.family_name || (rest.length ? rest.join(' ') : null),
            profile_pic: meta.avatar_url || meta.picture || null,
            role: 'buyer',
          });

          if (profileError) {
            console.error('❌ Profile creation after Google sign-in failed:', profileError);
          }
        }

        toast.success('Signed in with Google!');
        navigate('/services');
      } catch (error) {
        console.error('❌ Auth callback error:', error);
        navigate('/services');
      }
    };

    // The Supabase client auto-processes the OAuth redirect on load
    // (detectSessionInUrl: true), so just wait for the resulting session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        finishSignIn(session.user.id, session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        finishSignIn(session.user.id, session.user);
      }
    });

    const timeout = setTimeout(() => {
      if (!handled.current) setErrored(true);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (errored) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 gap-4">
        <p className="text-muted-foreground">Google sign-in didn't complete. Please try again.</p>
        <button className="text-primary underline" onClick={() => navigate('/login')}>
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
};

export default AuthCallback;
