import { supabase } from '../config/supabase.js';

// Export verifyToken as authenticate for backwards compatibility
export const authenticate = verifyToken;

/**
 * Verify authentication token and extract user
 * Sets req.user if token is valid
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 401,
        msg: 'Authorization token required',
        data: null
      });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return res.status(401).json({
        status: 401,
        msg: 'Invalid or expired token',
        data: null
      });
    }

    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Attach user to request object with role from profile
    req.user = {
      ...user,
      role: profile?.role || user.user_metadata?.role || 'buyer'
    };
    next();
  } catch (error) {
    return res.status(401).json({
      status: 401,
      msg: 'Authentication failed',
      data: null
    });
  }
};

/**
 * Optional token verification
 * Sets req.user if token is valid, but doesn't fail if token is missing/invalid
 * Useful for endpoints that work with or without auth
 */
export const optionalToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (!error && user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue even if token verification fails
    next();
  }
};

/**
 * Verify admin token
 * Checks if user has admin role
 */
export const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 401,
        msg: 'Authorization token required',
        data: null
      });
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return res.status(401).json({
        status: 401,
        msg: 'Invalid or expired token',
        data: null
      });
    }

    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || user.user_metadata?.role;

    // Check if user has admin role
    if (userRole !== 'admin') {
      return res.status(403).json({
        status: 403,
        msg: 'Access denied. Admin role required',
        data: null
      });
    }

    // Attach user to request object with role
    req.user = {
      ...user,
      role: userRole
    };
    next();
  } catch (error) {
    return res.status(401).json({
      status: 401,
      msg: 'Authentication failed',
      data: null
    });
  }
};

