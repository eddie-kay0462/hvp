import { supabase } from '../config/supabase.js';

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

    // Attach user to request object
    req.user = user;
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

    // Check if user has admin role
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({
        status: 403,
        msg: 'Access denied. Admin role required',
        data: null
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 401,
      msg: 'Authentication failed',
      data: null
    });
  }
};

