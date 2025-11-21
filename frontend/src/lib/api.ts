/**
 * API Configuration for connecting to the backend
 */

// Backend API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Maps technical error messages to user-friendly messages
 */
function getFriendlyErrorMessage(errorMessage: string, statusCode?: number): string {
  if (!errorMessage) {
    return 'Something went wrong. Please try again.';
  }

  const lowerMessage = errorMessage.toLowerCase();

  // Authentication errors
  if (lowerMessage.includes('invalid login credentials') || 
      lowerMessage.includes('invalid email or password') ||
      lowerMessage.includes('email not found') ||
      (lowerMessage.includes('user') && lowerMessage.includes('not found'))) {
    return 'The email or password you entered is incorrect. Please check and try again.';
  }

  if (lowerMessage.includes('wrong password')) {
    return 'The password you entered is incorrect. Please try again.';
  }

  if (lowerMessage.includes('email not confirmed') || 
      lowerMessage.includes('email not verified')) {
    return 'Please verify your email address before signing in. Check your inbox for the verification link.';
  }

  // Email validation errors
  if (lowerMessage.includes('invalid email') || 
      lowerMessage.includes('email format') ||
      lowerMessage.includes('email address')) {
    return 'Please enter a valid email address.';
  }

  if (lowerMessage.includes('user already registered') || 
      lowerMessage.includes('email already exists') ||
      lowerMessage.includes('already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  // Password errors
  if (lowerMessage.includes('password') && lowerMessage.includes('short')) {
    return 'Password must be at least 6 characters long.';
  }

  // Address errors (if applicable)
  if (lowerMessage.includes('address') && (lowerMessage.includes('invalid') || lowerMessage.includes('not found'))) {
    return 'Please enter a valid address.';
  }

  // Network/server errors
  if (statusCode === 401 || lowerMessage.includes('unauthorized')) {
    return 'You are not authorized to perform this action. Please sign in.';
  }

  if (statusCode === 403 || lowerMessage.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }

  if (statusCode === 404 || lowerMessage.includes('not found')) {
    return 'The requested resource was not found.';
  }

  if (statusCode === 500 || lowerMessage.includes('internal server error')) {
    return 'A server error occurred. Please try again later.';
  }

  if (statusCode === 503 || lowerMessage.includes('service unavailable')) {
    return 'The service is temporarily unavailable. Please try again later.';
  }

  // If it's already a user-friendly message, return as-is
  // Otherwise, return the original message but cleaned up
  return errorMessage;
}

/**
 * Generic API fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Get auth token from Supabase session if available
  try {
    // Import supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
    }
    
    if (session?.access_token) {
      (defaultHeaders as any)['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Try to parse error response from backend
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        // If JSON parsing fails, create a basic error structure
        errorData = { msg: `HTTP ${response.status}: ${response.statusText}` };
      }

      // Backend returns errors in format: { status, msg, data }
      // Extract the user-friendly message
      const errorMessage = errorData.msg || errorData.message || errorData.error;
      
      // Map common technical errors to user-friendly messages
      const friendlyMessage = getFriendlyErrorMessage(errorMessage, response.status);
      
      // For 401 errors, include the original error data for debugging
      if (response.status === 401) {
        const error = new Error(friendlyMessage);
        (error as any).status = 401;
        (error as any).originalError = errorData;
        throw error;
      }
      
      throw new Error(friendlyMessage);
    }

    return await response.json();
  } catch (error: any) {
    // If it's already our formatted error, re-throw it
    if (error.message && !error.message.includes('API request failed')) {
      throw error;
    }
    
    // Handle network errors and other edge cases
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    console.error('API Error:', error);
    throw new Error(error.message || 'Something went wrong. Please try again.');
  }
}

/**
 * API Methods
 */
export const api = {
  // Auth endpoints
  auth: {
    signup: (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      profilePic?: string;
      role: string;
    }) =>
      apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (email: string, password: string) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    verifyEmail: (token: string, type?: string) =>
      apiFetch('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token, type }),
      }),
    resendVerification: (email: string) =>
      apiFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    getMe: () =>
      apiFetch('/auth/me', {
        method: 'GET',
      }),
    logout: () =>
      apiFetch('/auth/logout', {
        method: 'POST',
      }),
  },

  // Services endpoints (public)
  services: {
    getAll: (params?: { category?: string; search?: string; limit?: number; offset?: number; sortBy?: string; order?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.order) queryParams.append('order', params.order);
      const query = queryParams.toString();
      return apiFetch(`/services${query ? `?${query}` : ''}`, { method: 'GET' });
    },
    getById: (id: string) => apiFetch(`/services/${id}`, { method: 'GET' }),
  },

  // Seller endpoints
  sellers: {
    createService: (data: any) =>
      apiFetch('/sellers/create-service', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateService: (serviceId: string, data: any) =>
      apiFetch(`/sellers/edit-service/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleServiceStatus: (serviceId: string) =>
      apiFetch(`/sellers/toggleServiceStatus/${serviceId}`, {
        method: 'PUT',
      }),
    setupSeller: (data: any) =>
      apiFetch('/sellers/setup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Booking endpoints
  bookings: {
    create: (data: { serviceId: string; date: string | null; time: string | null; status?: string; note?: string | null }) =>
      apiFetch('/bookings/book-now', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getById: (bookingId: string) =>
      apiFetch(`/bookings/${bookingId}`, { method: 'GET' }),
    getUserBookings: (role: 'buyer' | 'seller' = 'buyer') =>
      apiFetch(`/bookings?role=${role}`, { method: 'GET' }),
    accept: (bookingId: string) =>
      apiFetch(`/bookings/${bookingId}/accept`, {
        method: 'PATCH',
      }),
    updateStatus: (bookingId: string, status: string) =>
      apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    confirm: (bookingId: string) =>
      apiFetch(`/bookings/${bookingId}/confirm`, {
        method: 'PATCH',
      }),
    cancel: (bookingId: string) =>
      apiFetch(`/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
      }),
  },

  // Request endpoints
  requests: {
    create: (data: { title: string; description: string; needed_by: string }) =>
      apiFetch('/requests/create-request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    accept: (requestId: string) =>
      apiFetch(`/requests/${requestId}/accept`, {
        method: 'PATCH',
      }),
  },

  // Review endpoints
  reviews: {
    create: (bookingId: string, data: { rating: number; review_text?: string }) =>
      apiFetch(`/reviews/booking/${bookingId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getSellerReviews: (sellerId: string) =>
      apiFetch(`/reviews/seller/${sellerId}`, { method: 'GET' }),
    checkExisting: (bookingId: string) =>
      apiFetch(`/reviews/booking/${bookingId}/check`, { method: 'GET' }),
  },

  // Health check
  health: () => apiFetch('/health', { method: 'GET' }),
};

export default api;

