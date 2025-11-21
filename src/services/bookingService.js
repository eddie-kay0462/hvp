import { supabase } from '../config/supabase.js';

/**
 * Book a service now
 * @param {string} userId - Buyer's user ID
 * @param {string} serviceId - Service ID to book
 * @param {Object} bookingData - Booking data (date, time, status)
 * @returns {Promise<Object>} Booking result
 */
export const bookNow = async (userId, serviceId, bookingData) => {
  try {
    if (!userId || !serviceId) {
      return { status: 400, msg: "User ID and Service ID are required", data: null };
    }

    const { date, time, status = 'pending', note } = bookingData;

    // Date and time are now optional (for instant bookings)
    // Only validate if both are provided (scheduled booking)
    if (date || time) {
      if (!date || !time) {
        return { status: 400, msg: "Both date and time are required if scheduling", data: null };
      }

      // Validate date format if provided
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return { status: 400, msg: "Invalid date format", data: null };
      }

      // Check if date is in the future (if scheduling)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(dateObj);
      selected.setHours(0, 0, 0, 0);

      if (selected < today) {
        return { status: 400, msg: "Booking date must be in the future", data: null };
      }
    }

    // Get the profile ID from user ID (bookings.buyer_id references profiles.id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return { status: 404, msg: "User profile not found. Please complete your profile setup.", data: null };
    }

    // First, verify the service exists and is verified
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, is_verified, is_active, user_id')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      if (serviceError?.code === 'PGRST116') {
        return { status: 404, msg: "Service not found", data: null };
      }
      return { status: 404, msg: "Service not found", data: null };
    }

    // Check if service is verified
    if (!service.is_verified) {
      return { status: 403, msg: "Cannot book unverified service", data: null };
    }

    // Check if service is active
    if (!service.is_active) {
      return { status: 403, msg: "Cannot book inactive service", data: null };
    }

    // Prevent sellers from booking their own services
    if (service.user_id === userId) {
      return { status: 403, msg: "Cannot book your own service", data: null };
    }

    // Check for existing active bookings for the same buyer and service
    // Only one active booking per buyer per service is allowed at any time
    // Active bookings are those that are not 'completed' or 'cancelled'
    const { data: existingBookings, error: checkError } = await supabase
      .from('bookings')
      .select('id, status, date, time')
      .eq('buyer_id', profile.id)
      .eq('service_id', serviceId)
      .in('status', ['pending', 'accepted', 'in_progress']);

    if (checkError) {
      console.error("Error checking for existing bookings:", checkError);
      return { status: 500, msg: "Failed to validate booking availability", data: null };
    }

    if (existingBookings && existingBookings.length > 0) {
      return { 
        status: 409, 
        msg: "You already have an active booking for this service. Please complete or cancel your existing booking before creating a new one.", 
        data: null 
      };
    }

    // Create the booking using profile.id (not userId)
    // Date and time are optional (null for instant bookings)
    const bookingDataToInsert = {
      buyer_id: profile.id, // Use profile.id instead of userId
      service_id: serviceId,
      date: date || null, // Can be null for instant bookings
      time: time || null, // Can be null for instant bookings
      status: status,
      // Payment fields - will be populated when payment API is ready
      payment_status: null, // 'pending', 'captured', 'in_escrow', 'released', 'refunded'
      payment_captured_at: null,
      payment_released_at: null,
      payment_amount: null,
      payment_transaction_id: null,
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingDataToInsert)
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return { status: 400, msg: bookingError.message || "Failed to create booking", data: null };
    }

    return {
      status: 201,
      msg: "Booking created successfully",
      data: booking
    };
  } catch (e) {
    console.error("bookNow error:", e);
    return { status: 500, msg: "Failed to create booking", data: null };
  }
};

/**
 * Get booking by ID
 * @param {string} userId - User ID (buyer or seller)
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Booking details
 */
export const getBookingById = async (userId, bookingId) => {
  try {
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    // Get booking with service details (without seller join for now)
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        service:services (
          id,
          title,
          description,
          category,
          default_price,
          express_price
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      if (error?.code === 'PGRST116') {
        return { status: 404, msg: "Booking not found", data: null };
      }
      return { status: 404, msg: "Booking not found", data: null };
    }

    // Check if user has permission (buyer or seller of the service)
    const isBuyer = booking.buyer_id === userId;
    
    // Check if user is the seller by checking if they own the service
    let isSeller = false;
    if (booking.service_id) {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('user_id')
        .eq('id', booking.service_id)
        .single();
      
      if (!serviceError && service) {
        isSeller = service.user_id === userId;
      }
    }

    if (!isBuyer && !isSeller) {
      return { status: 403, msg: "You do not have permission to view this booking", data: null };
    }

    return {
      status: 200,
      msg: "Booking retrieved successfully",
      data: booking
    };
  } catch (e) {
    console.error("getBookingById error:", e);
    return { status: 500, msg: "Failed to retrieve booking", data: null };
  }
};

/**
 * Get all bookings for a user (as buyer or seller)
 * @param {string} userId - User ID
 * @param {string} role - 'buyer' or 'seller'
 * @returns {Promise<Object>} List of bookings
 */
export const getUserBookings = async (userId, role = 'buyer') => {
  try {
    if (role === 'buyer') {
      // Get bookings where user is the buyer
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services (
            id,
            title,
            description,
            category,
            default_price,
            express_price
          )
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { status: 400, msg: error.message, data: null };
      }

      return {
        status: 200,
        msg: "Bookings retrieved successfully",
        data: { bookings: bookings || [] }
      };
    } else if (role === 'seller') {
      // For seller, first get their services, then get bookings for those services
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('user_id', userId);

      if (servicesError) {
        return { status: 400, msg: "Failed to fetch seller services", data: null };
      }

      const serviceIds = services.map(s => s.id);
      if (serviceIds.length === 0) {
        return { status: 200, msg: "No bookings found", data: { bookings: [] } };
      }

      // Get bookings for seller's services
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services (
            id,
            title,
            description,
            category,
            default_price,
            express_price
          )
        `)
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false });

      if (error) {
        return { status: 400, msg: error.message, data: null };
      }

      return {
        status: 200,
        msg: "Bookings retrieved successfully",
        data: { bookings: bookings || [] }
      };
    } else {
      return { status: 400, msg: "Invalid role. Must be 'buyer' or 'seller'", data: null };
    }
  } catch (e) {
    console.error("getUserBookings error:", e);
    return { status: 500, msg: "Failed to retrieve bookings", data: null };
  }
};

export const acceptBooking = async (userId, bookingId) => {
  try {
    // Get the booking with service info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, service:services(user_id)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: "Booking not found", data: null };
    }

    // Verify user is the seller (owns the service)
    if (booking.service.user_id !== userId) {
      return { status: 403, msg: "You do not have permission to accept this booking", data: null };
    }

    // Check if booking is in pending status
    if (booking.status !== 'pending') {
      return { status: 400, msg: `Cannot accept booking with status: ${booking.status}`, data: null };
    }

    // Update booking status to accepted
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'accepted' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return { status: 200, msg: "Booking accepted successfully", data };
  } catch (e) {
    console.error("acceptBooking error:", e);
    return { status: 500, msg: "Failed to accept booking", data: null };
  }
};

/**
 * Update booking status
 * @param {string} userId - User ID (buyer or seller)
 * @param {string} bookingId - Booking ID
 * @param {string} newStatus - New status ('accepted', 'in_progress', 'completed', 'cancelled')
 * @returns {Promise<Object>} Updated booking
 */
export const updateBookingStatus = async (userId, bookingId, newStatus) => {
  try {
    if (!bookingId || !newStatus) {
      return { status: 400, msg: "Booking ID and status are required", data: null };
    }

    // Valid statuses
    const validStatuses = ['pending', 'accepted', 'in_progress', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return { status: 400, msg: `Invalid status. Must be one of: ${validStatuses.join(', ')}`, data: null };
    }

    // Get booking with service info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, service:services(user_id)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: "Booking not found", data: null };
    }

    // Check permissions
    const isBuyer = booking.buyer_id === userId;
    const isSeller = booking.service?.user_id === userId;

    if (!isBuyer && !isSeller) {
      return { status: 403, msg: "You do not have permission to update this booking", data: null };
    }

    // Validate status transitions
    const currentStatus = booking.status;

    // Seller can update: pending → accepted → in_progress → delivered
    if (isSeller) {
      if (newStatus === 'accepted' && currentStatus !== 'pending') {
        return { status: 400, msg: `Cannot accept booking with status: ${currentStatus}`, data: null };
      }
      if (newStatus === 'in_progress' && currentStatus !== 'accepted') {
        return { status: 400, msg: `Cannot mark as in progress. Booking must be accepted first.`, data: null };
      }
      if (newStatus === 'delivered' && currentStatus !== 'in_progress') {
        return { status: 400, msg: `Cannot mark as delivered. Booking must be in progress first.`, data: null };
      }
      // Sellers cannot directly mark as completed - buyer must confirm
      if (newStatus === 'completed' && isSeller) {
        return { status: 403, msg: `Sellers cannot mark booking as completed. The buyer must confirm completion.`, data: null };
      }
    }

    // Buyer can only confirm delivery (delivered → completed)
    if (isBuyer) {
      if (newStatus === 'completed' && currentStatus !== 'delivered') {
        return { status: 400, msg: `Cannot confirm completion. Booking must be marked as delivered by the seller first.`, data: null };
      }
      // Buyers cannot set other statuses
      if (newStatus !== 'completed' && newStatus !== 'cancelled') {
        return { status: 403, msg: `Buyers can only confirm completion or cancel bookings.`, data: null };
      }
    }

    // Buyer or seller can cancel if status is pending or accepted
    if (newStatus === 'cancelled') {
      if (currentStatus === 'completed' || currentStatus === 'cancelled') {
        return { status: 400, msg: `Cannot cancel booking with status: ${currentStatus}`, data: null };
      }
      if (currentStatus === 'in_progress' && !isSeller) {
        return { status: 403, msg: "Cannot cancel booking that is in progress. Contact the seller.", data: null };
      }
      if (currentStatus === 'delivered' && !isSeller) {
        return { status: 403, msg: "Cannot cancel booking that has been delivered. Please confirm or dispute the delivery.", data: null };
      }
    }

    // Cannot update from completed or cancelled
    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
      return { status: 400, msg: `Cannot update booking with status: ${currentStatus}`, data: null };
    }

    // Update status
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    // If buyer is confirming completion (delivered → completed), release payment
    if (newStatus === 'completed' && currentStatus === 'delivered' && isBuyer) {
      // Import payment service dynamically to avoid circular dependencies
      const { releasePayment } = await import('./paymentService.js');
      const releaseResult = await releasePayment(bookingId);
      
      if (releaseResult.status === 200) {
        // Update payment status in booking
        await supabase
          .from('bookings')
          .update({ 
            payment_status: 'released',
            payment_released_at: new Date().toISOString()
          })
          .eq('id', bookingId);
      }
    }

    return { status: 200, msg: `Booking status updated to ${newStatus}`, data };
  } catch (e) {
    console.error("updateBookingStatus error:", e);
    return { status: 500, msg: "Failed to update booking status", data: null };
  }
};

/**
 * Confirm booking completion (buyer only)
 * This moves the booking from 'delivered' to 'completed' and releases payment
 * @param {string} userId - Buyer's user ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Confirmed booking
 */
export const confirmBookingCompletion = async (userId, bookingId) => {
  try {
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    // Get booking with service info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, service:services(user_id)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: "Booking not found", data: null };
    }

    // Verify user is the buyer
    if (booking.buyer_id !== userId) {
      return { status: 403, msg: "Only the buyer can confirm booking completion", data: null };
    }

    // Check if booking is in 'delivered' status
    if (booking.status !== 'delivered') {
      return { 
        status: 400, 
        msg: `Cannot confirm completion. Booking must be marked as delivered by the seller first. Current status: ${booking.status}`, 
        data: null 
      };
    }

    // Update to completed status (this will trigger payment release in updateBookingStatus)
    return await updateBookingStatus(userId, bookingId, 'completed');
  } catch (e) {
    console.error("confirmBookingCompletion error:", e);
    return { status: 500, msg: "Failed to confirm booking completion", data: null };
  }
};

/**
 * Cancel booking (convenience method)
 * @param {string} userId - User ID (buyer or seller)
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Cancelled booking
 */
export const cancelBooking = async (userId, bookingId) => {
  return await updateBookingStatus(userId, bookingId, 'cancelled');
};