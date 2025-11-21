import { supabase } from "../config/supabase.js";

import { supabaseAdmin } from "../config/supabase.js";

export const signup = async ({ email, password, firstName, lastName, phoneNumber, profilePic, role }) => {
  try {
    const metadata = { firstName, lastName, phoneNumber, profilePic, role };

    // Get frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const redirectUrl = `${frontendUrl}/verify-email`;

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
      return { status: 400, msg: error.message, data: null };
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
    // Get frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const redirectUrl = `${frontendUrl}/verify-email`;

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
