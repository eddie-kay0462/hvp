import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Supabase reports OAuth failures via error params in the callback URL (hash or query). */
const getAuthErrorFromUrl = (): string | null => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);
  const description =
    hashParams.get('error_description') || queryParams.get('error_description');
  const code = hashParams.get('error') || queryParams.get('error');
  if (!description && !code) return null;
  return description || code;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [errored, setErrored] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    const urlError = getAuthErrorFromUrl();
    if (urlError) {
      console.error('❌ OAuth callback returned an error:', urlError);
      setErrorDetail(urlError);
      setErrored(true);
      return;
    }

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

          // NOTE: role is intentionally NOT set here. The anon/authenticated key
          // is not granted write access to profiles.role (see
          // restrict_profiles_privileged_columns.sql) to prevent privilege
          // escalation; the column defaults to 'buyer' at the DB level.
          const { error: profileError } = await supabase.from('profiles').insert({
            id: userId,
            email: user.email || null,
            first_name: meta.given_name || firstName || null,
            last_name: meta.family_name || (rest.length ? rest.join(' ') : null),
            profile_pic: meta.avatar_url || meta.picture || null,
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
        {errorDetail && (
          <p className="text-sm text-destructive max-w-md text-center break-words">{errorDetail}</p>
        )}
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
