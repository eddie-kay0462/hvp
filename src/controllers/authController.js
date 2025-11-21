import * as authService from "../services/authService.js";
   // controller for signup. What does it do?
export const signup = async (req) => {
  try {
    const { email, password, firstName, lastName, phoneNumber, profilePic, role } = req.body;

    if (!email || !password || !role) {
      return { status: 400, msg: "Email and password are required", data: null };
    }

    if (password.length < 6) {
      return { status: 400, msg: "Password must be at least 6 characters long", data: null };
    }

    const result = await authService.signup({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      profilePic,
      role
    });

    return {
      status: result.status,
      msg: result.msg,
      data: result.data,
    };

  } catch (error) {
    return { status: 500, msg: "Signup failed", data: null };
  }
};



export const login = async (req) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return { status: 400, msg: "Email and password are required", data: null };
    }

    const result = await authService.login(email, password);

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    return { status: 500, msg: "Login failed", data: null };
  }
};



export const resendVerification = async (req) => {
  try {
    const { email } = req.body;

    if (!email) {
      return { status: 400, msg: "Email is required", data: null };
    }

    const result = await authService.resendVerification(email);

    return {
      status: result.status,
      msg: result.msg,
      data: null
    };
  } catch (error) {
    return { status: 500, msg: "Failed to resend verification email", data: null };
  }
};


export const verifyEmail = async (req) => {
  try {
    const { token, type } = req.body;

    if (!token) {
      return { status: 400, msg: "Token is required", data: null };
    }

    const result = await authService.verifyEmail(token, type);

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };

  } catch (error) {
    return { status: 500, msg: "Email verification failed", data: null };
  }
};


export const getMe = async (req) => {
  try {
    // User is already set by verifyToken middleware
    if (!req.user) {
      return { status: 401, msg: "Unauthorized", data: null };
    }

    return {
      status: 200,
      msg: "User retrieved",
      data: req.user
    };
  } catch (error) {
    return { status: 500, msg: "Failed to fetch user", data: null };
  }
};



export const logout = async () => {
  try {
    const result = await authService.logout();
    return {
      status: result.status,
      msg: result.msg,
      data: null
    };
  } catch (error) {
    return { status: 500, msg: "Logout failed", data: null };
  }
};

export default {
  signup,
  login,
  resendVerification,
  verifyEmail,
  getMe,
  logout
};
