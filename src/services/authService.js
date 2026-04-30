import { supabase } from "../config/supabase.js";

import { supabaseAdmin } from "../config/supabase.js";

/** Base URL for Supabase emailRedirectTo (signup confirm, resend). Prefer AUTH_SITE_URL when FRONTEND_URL is a different domain. */
function getAuthEmailRedirectOrigin() {
  const raw =
    process.env.AUTH_SITE_URL ||
    process.env.FRONTEND_URL ||
    "https://hustlevillage.app";
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

export const signup = async ({ email, password, firstName, lastName, phoneNumber, profilePic, role }) => {
  try {
    // Include the password_updated_after_requirements_change flag since password already meets requirements
    const metadata = { 
      firstName, 
      lastName, 
      phoneNumber, 
      profilePic, 
      role,
      password_updated_after_requirements_change: true  // Set to true since password already validated during signup
    };

    const redirectUrl = `${getAuthEmailRedirectOrigin()}/verify-email`;

    // Step 1: Create auth user
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: { 
        data: metadata,
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    // Step 2: Insert profile using service role (bypasses RLS)
    if (data.user?.id) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,           // match auth.users.id
          email: email || null,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phoneNumber || null,
          role: role || 'buyer',
          profile_pic: profilePic || null
        });

      if (profileError) {
        console.error("Profile creation failed:", profileError);
        // You can still return success because auth user exists
      }
    }

    return {
      status: 201,
      msg: "Signup successful. Please verify your email.",
      data: {
        userId: data.user?.id,
        email: data.user?.email
      }
    };

  } catch (e) {
    console.error("Signup error:", e);
    return { status: 500, msg: "Signup failed", data: null };
  }
};



export const login = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Determine whether the failure is a missing account or a wrong password.
      // GoTrue's admin list-users endpoint supports ?filter= for email search.
      const supabaseUrl = process.env.SUPABASE_URL;
      const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

      try {
        const lookupRes = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=10`,
          {
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
            },
          }
        );
        const lookupJson = await lookupRes.json();
        // filter= does a substring search, so verify exact email match
        const emailExists =
          Array.isArray(lookupJson?.users) &&
          lookupJson.users.some(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          );

        if (!emailExists) {
          return {
            status: 404,
            msg: "No account found with that email address. Please sign up first.",
            data: null,
          };
        }
      } catch (lookupErr) {
        console.error("Email lookup failed:", lookupErr);
        // Fall through to the generic wrong-password message below
      }

      return {
        status: 401,
        msg: "Incorrect password. Please try again or reset your password.",
        data: null,
      };
    }

    return {
      status: 200,
      msg: "Login successful",
      data: {
        user: data.user,
        session: data.session
      }
    };

  } catch (e) {
    return { status: 500, msg: "Login failed", data: null };
  }
};



export const resendVerification = async (email) => {
  try {
    const redirectUrl = `${getAuthEmailRedirectOrigin()}/verify-email`;

    const { error } = await supabase.auth.resend({ 
      email, 
      type: "signup",
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return { status: 200, msg: "Verification email sent", data: null };

  } catch (e) {
    return { status: 500, msg: "Failed to resend verification email", data: null };
  }
};



export const verifyEmail = async (token, type = "signup") => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: token, type });

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return {
      status: 200,
      msg: "Email verified successfully",
      data: data
    };

  } catch (e) {
    return { status: 500, msg: "Email verification failed", data: null };
  }
};



export const getMe = async (accessToken) => {
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error) {
      return { status: 401, msg: error.message, data: null };
    }

    return { status: 200, msg: "User retrieved", data: data.user };

  } catch (e) {
    return { status: 500, msg: "Failed to get user", data: null };
  }
};



export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return { status: 200, msg: "Logout successful", data: null };

  } catch (e) {
    return { status: 500, msg: "Logout failed", data: null };
  }
};
