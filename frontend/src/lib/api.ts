/**
 * API Configuration for connecting to the backend
 */

import { supabase } from '@/integrations/supabase/client';

// Backend API Base URL
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

/**
 * Maps technical error messages to user-friendly messages
 */
function getFriendlyErrorMessage(errorMessage: string, statusCode?: number): string {
  if (!errorMessage) {
    return 'Something went wrong. Please try again.';
  }

  const lowerMessage = errorMessage.toLowerCase();

  // Specific login errors from backend — pass through as-is
  if (lowerMessage.includes('no account found with that email')) {
    return errorMessage;
  }

  if (lowerMessage.includes('incorrect password')) {
    return errorMessage;
  }

  // Generic Supabase auth fallback
  if (lowerMessage.includes('invalid login credentials') ||
      lowerMessage.includes('invalid email or password')) {
    return 'The email or password you entered is incorrect. Please check and try again.';
  }

  if (lowerMessage.includes('email not confirmed') || 
      lowerMessage.includes('email not verified')) {
    return 'Please verify your email address before signing in. Check your inbox for the verification link.';
  }

  // Supabase Auth + custom SMTP (e.g. Zoho): GoTrue could not send the signup email
  if (
    lowerMessage.includes('error sending confirmation email') ||
    lowerMessage.includes('sending confirmation email')
  ) {
    return 'We could not send the verification email. Signup did not complete. Try again later, or contact support if this continues.';
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
    // Backend 403s name the actual rule ("Only the buyer can leave a review for
    // this booking"), which is far more useful than a blanket denial.
    return errorMessage || 'You do not have permission to perform this action.';
  }

  if (statusCode === 404 || lowerMessage.includes('not found')) {
    // Same reasoning as 403/409: "Booking not found" or "User profile not found.
    // Please complete your profile setup." tells the user what to do next;
    // "The requested resource was not found." tells them nothing.
    return errorMessage || 'The requested resource was not found.';
  }

  // Duplicate/conflict errors (409)
  // The backend writes every 409 message for end users ("This seller is currently
  // working on another booking", "You have already left a review for this booking",
  // …), so pass it through and let it explain the actual conflict. Only raw
  // database constraint errors, which leak table and column names, get replaced.
  if (statusCode === 409 || lowerMessage.includes('duplicate')) {
    if (lowerMessage.includes('violates unique constraint') ||
        lowerMessage.includes('duplicate key value') ||
        lowerMessage.includes('23505')) {
      return 'This item already exists. Please check your existing items or try a different name.';
    }
    return errorMessage;
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
/** Error thrown by the API layer, carrying the HTTP status and backend payload. */
interface ApiError extends Error {
  status?: number;
  originalError?: unknown;
}

/** The backend's JSON envelope for responses and errors: { status, msg, data }. */
export interface BackendEnvelope<T = unknown> {
  status?: number;
  msg?: string;
  message?: string;
  error?: string;
  data?: T;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure proper URL construction: remove trailing slash from base, ensure endpoint starts with /
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Get auth token from Supabase session if available
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
    }
    
    if (session?.access_token) {
      defaultHeaders['Authorization'] = `Bearer ${session.access_token}`;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(url, { ...config, signal: controller.signal });
    
    if (!response.ok) {
      // Try to parse error response from backend
      let errorData: BackendEnvelope;
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
        const error: ApiError = new Error(friendlyMessage);
        error.status = 401;
        error.originalError = errorData;
        throw error;
      }
      
      throw new Error(friendlyMessage);
    }

    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    const err = error as ApiError & { name?: string };

    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server took too long to respond — your action may have already been saved. Please refresh before trying again.');
    }

    // If it's already our formatted error, re-throw it
    if (err.message && !err.message.includes('API request failed')) {
      throw error;
    }

    // Handle network errors and other edge cases
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }

    console.error('API Error:', error);
    throw new Error(err.message || 'Something went wrong. Please try again.');
  }
}

/**
 * Multipart upload (no JSON Content-Type — browser sets boundary).
 */
async function apiFetchFormData(endpoint: string, formData: FormData): Promise<unknown> {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {};
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
    }
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  let json: BackendEnvelope;
  try {
    json = await response.json();
  } catch {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.ok) {
    const errorMessage = json.msg || json.message || json.error;
    throw new Error(getFriendlyErrorMessage(errorMessage, response.status));
  }

  return json;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  tagline: string | null;
  member_count?: number;
}

export interface VendorContact {
  bio: string | null;
  /** International digits only, e.g. 233241234567 — ready for wa.me links. */
  whatsapp_number: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  /** Without the @. */
  instagram_handle: string | null;
  website_url: string | null;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  image_urls: string[];
  link_url: string | null;
  completed_on: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type PortfolioItemInput = Partial<
  Pick<PortfolioItem, 'description' | 'image_urls' | 'link_url' | 'completed_on' | 'position'>
> & { title: string };

export interface VendorCommunity {
  slug: string;
  name: string;
  short_name: string | null;
  joined_at: string;
}

export interface MyVendorProfile extends VendorContact {
  portfolio: PortfolioItem[];
  communities: VendorCommunity[];
}

export interface PublicVendorProfile extends MyVendorProfile {
  user_id: string;
  display_name: string;
  profile_pic: string | null;
  member_since: string | null;
  services: Array<{
    id: string;
    title: string;
    category: string;
    image_urls: string[] | null;
    pricing_type: string | null;
    default_price: number | null;
    price_min: number | null;
    price_max: number | null;
    created_at: string;
  }>;
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
    getAll: (params?: { category?: string; search?: string; limit?: number; offset?: number; sortBy?: string; order?: string; priceMin?: number; priceMax?: number; minRating?: number; community?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.community) queryParams.append('community', params.community);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.order) queryParams.append('order', params.order);
      if (params?.priceMin != null) queryParams.append('priceMin', params.priceMin.toString());
      if (params?.priceMax != null) queryParams.append('priceMax', params.priceMax.toString());
      if (params?.minRating != null) queryParams.append('minRating', params.minRating.toString());
      const query = queryParams.toString();
      return apiFetch(`/services${query ? `?${query}` : ''}`, { method: 'GET' });
    },
    getById: (id: string) => apiFetch(`/services/${id}`, { method: 'GET' }),
  },

  // Seller endpoints
  sellers: {
    createService: (data: Record<string, unknown>) =>
      apiFetch('/sellers/create-service', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateService: (serviceId: string, data: Record<string, unknown>) =>
      apiFetch(`/sellers/edit-service/${serviceId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleServiceStatus: (serviceId: string) =>
      apiFetch(`/sellers/toggleServiceStatus/${serviceId}`, {
        method: 'PUT',
      }),
    getPublicStats: (sellerId: string) =>
      apiFetch(`/sellers/${sellerId}/stats`),
    setupSeller: (data: Record<string, unknown>) =>
      apiFetch('/sellers/setup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Vendor page: bio, contacts, portfolio, communities, live services.
    getPublicProfile: (sellerId: string) =>
      apiFetch<BackendEnvelope<PublicVendorProfile>>(`/sellers/${sellerId}/public`),
    getMyProfile: () =>
      apiFetch<BackendEnvelope<MyVendorProfile>>('/sellers/me/profile'),
    updateMyContact: (data: Partial<VendorContact>) =>
      apiFetch<BackendEnvelope<VendorContact>>('/sellers/me/contact', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    createPortfolioItem: (data: PortfolioItemInput) =>
      apiFetch<BackendEnvelope<PortfolioItem>>('/sellers/me/portfolio', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updatePortfolioItem: (itemId: string, data: Partial<PortfolioItemInput>) =>
      apiFetch<BackendEnvelope<PortfolioItem>>(`/sellers/me/portfolio/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deletePortfolioItem: (itemId: string) =>
      apiFetch<BackendEnvelope<{ id: string }>>(`/sellers/me/portfolio/${itemId}`, {
        method: 'DELETE',
      }),
  },

  // Campus communities (ashesi.hustlevillage.app etc.)
  communities: {
    get: (slug: string) =>
      apiFetch<BackendEnvelope<Community>>(`/communities/${slug}`),
    join: (slug: string) =>
      apiFetch<BackendEnvelope<{ community: Community }>>(`/communities/${slug}/join`, {
        method: 'POST',
      }),
  },

  // Booking endpoints
  bookings: {
    create: (data: { serviceId: string; date: string | null; time: string | null; status?: string; note?: string | null; buyer_requirements?: string | null; selected_package_name?: string | null }) =>
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
    submitQuote: (bookingId: string, data: { quotedPrice: number; quoteNote?: string }) =>
      apiFetch(`/bookings/${bookingId}/quote`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    respondToQuote: (bookingId: string, accepted: boolean) =>
      apiFetch(`/bookings/${bookingId}/quote/respond`, {
        method: 'POST',
        body: JSON.stringify({ accepted }),
      }),
  },

  // Offer endpoints (seller sends custom price offer in chat)
  offers: {
    send: (data: { conversationId: string; price: number; note?: string }) =>
      apiFetch('/offers/send', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    respond: (data: { messageId: string; accepted: boolean }) =>
      apiFetch('/offers/respond', {
        method: 'POST',
        body: JSON.stringify(data),
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

  // Payments
  payments: {
    initiate: (bookingId: string) =>
      apiFetch('/payments/initiate', {
        method: 'POST',
        body: JSON.stringify({ bookingId }),
      }),
    verify: (reference: string) =>
      apiFetch(`/payments/verify?reference=${encodeURIComponent(reference)}`, {
        method: 'GET',
      }),
    submitMomoProof: (formData: FormData) =>
      apiFetchFormData('/payments/momo/submit', formData),
  },

  // Invoices
  invoices: {
    getById: (invoiceId: string) =>
      apiFetch(`/invoices/${invoiceId}`, {
        method: 'GET',
      }),
  },

  // Admin endpoints
  admin: {
    // Get pending services
    getPendingServices: () =>
      apiFetch('/admin/services/pending', {
        method: 'GET',
      }),
    // Get all services with filters
    getAllServices: (filters?: { is_verified?: boolean; is_active?: boolean; category?: string }) => {
      const queryParams = new URLSearchParams();
      if (filters?.is_verified !== undefined) queryParams.append('is_verified', String(filters.is_verified));
      if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
      if (filters?.category) queryParams.append('category', filters.category);
      const query = queryParams.toString();
      return apiFetch(`/admin/services${query ? `?${query}` : ''}`, { method: 'GET' });
    },
    // Approve a service
    approveService: (serviceId: string) =>
      apiFetch(`/admin/services/${serviceId}/approve`, {
        method: 'POST',
      }),
    // Reject a service
    rejectService: (serviceId: string, rejectionReason: string, adminNotes?: string) =>
      apiFetch(`/admin/services/${serviceId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason, adminNotes }),
      }),
    // Get service statistics
    getServiceStats: () =>
      apiFetch('/admin/services/stats', {
        method: 'GET',
      }),
    getPendingMomoPayments: () =>
      apiFetch('/admin/payments/momo/pending', {
        method: 'GET',
      }),
    getMomoPaymentHistory: (params?: { limit?: number; offset?: number; event_type?: string }) => {
      const q = new URLSearchParams();
      if (params?.limit != null) q.append('limit', String(params.limit));
      if (params?.offset != null) q.append('offset', String(params.offset));
      if (params?.event_type) q.append('event_type', params.event_type);
      const qs = q.toString();
      return apiFetch(`/admin/payments/momo/history${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    getServiceModerationHistory: (params?: { limit?: number; offset?: number; event_type?: string }) => {
      const q = new URLSearchParams();
      if (params?.limit != null) q.append('limit', String(params.limit));
      if (params?.offset != null) q.append('offset', String(params.offset));
      if (params?.event_type) q.append('event_type', params.event_type);
      const qs = q.toString();
      return apiFetch(`/admin/services/moderation-history${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    verifyMomoPayment: (bookingId: string, approve: boolean, rejectionReason?: string) =>
      apiFetch(`/admin/payments/momo/${bookingId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ approve, rejectionReason }),
      }),
    confirmPayout: (bookingId: string, formData: FormData) =>
      apiFetchFormData(`/admin/payouts/${bookingId}/confirm`, formData),
    getPendingPayouts: () =>
      apiFetch('/admin/payouts/pending', { method: 'GET' }),
  },

  disputes: {
    raise: (bookingId: string, reason: string, details?: string) =>
      apiFetch('/disputes', {
        method: 'POST',
        body: JSON.stringify({ bookingId, reason, details }),
      }),
    getAll: (status?: string) =>
      apiFetch(`/disputes/admin${status ? `?status=${status}` : ''}`, { method: 'GET' }),
    resolve: (disputeId: string, resolution: string, newStatus?: string) =>
      apiFetch(`/disputes/admin/${disputeId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolution, newStatus }),
      }),
  },

  // Health check
  health: () => apiFetch('/health', { method: 'GET' }),
};

export default api;

