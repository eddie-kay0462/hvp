import * as bookingService from '../services/bookingService.js';

/**
 * Book a service now
 * Requires: serviceId, date, time in request body
 */
const bookNow = async (req) => {
  try {
    const userId = req.user?.id; // from verifyToken middleware
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { serviceId, date, time, status, buyer_requirements, selected_package_name } = req.body;

    // Validation
    if (!serviceId) {
      return { status: 400, msg: "Service ID is required", data: null };
    }

    // Date and time are now optional (for instant bookings)
    // Only validate if both are provided
    if (date || time) {
      if (!date || !time) {
        return { status: 400, msg: "Both date and time are required if scheduling", data: null };
      }

      // Validate date format (basic check)
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return { status: 400, msg: "Invalid date format", data: null };
      }

      // Check if date is in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(dateObj);
      selected.setHours(0, 0, 0, 0);

      if (selected < today) {
        return { status: 400, msg: "Booking date must be in the future", data: null };
      }
    }

    const result = await bookingService.bookNow(userId, serviceId, {
      date: date || null,
      time: time || null,
      status: status || 'pending',
      buyer_requirements: buyer_requirements || null,
      selected_package_name: selected_package_name || null,
    });

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Book now error:", error);
    return { status: 500, msg: "Failed to create booking", data: null };
  }
};

/**
 * Get booking by ID
 */
const getBookingById = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    const result = await bookingService.getBookingById(userId, bookingId, req.user?.role);

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Get booking error:", error);
    return { status: 500, msg: "Failed to retrieve booking", data: null };
  }
};

/**
 * Get user's bookings (as buyer or seller)
 * Query param: role (buyer or seller, defaults to buyer)
 */
const getUserBookings = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { role = 'buyer', limit, offset } = req.query;

    if (role !== 'buyer' && role !== 'seller') {
      return { status: 400, msg: "Role must be 'buyer' or 'seller'", data: null };
    }

    const pagination = {
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: Math.max(parseInt(offset) || 0, 0),
    };

    const result = await bookingService.getUserBookings(userId, role, pagination);

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Get user bookings error:", error);
    return { status: 500, msg: "Failed to retrieve bookings", data: null };
  }
};
const acceptBooking = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { bookingId } = req.params;
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    const result = await bookingService.acceptBooking(userId, bookingId);
    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Accept booking error:", error);
    return { status: 500, msg: "Failed to accept booking", data: null };
  }
};

/**
 * Update booking status
 * Requires: status in request body
 */
const updateBookingStatus = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { bookingId } = req.params;
    const { status } = req.body;

    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    if (!status) {
      return { status: 400, msg: "Status is required", data: null };
    }

    const result = await bookingService.updateBookingStatus(userId, bookingId, status);
    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Update booking status error:", error);
    return { status: 500, msg: "Failed to update booking status", data: null };
  }
};

/**
 * Confirm booking completion (buyer only)
 * Moves booking from 'delivered' to 'completed' and releases payment
 */
const confirmBookingCompletion = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { bookingId } = req.params;
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    const result = await bookingService.confirmBookingCompletion(userId, bookingId);
    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Confirm booking completion error:", error);
    return { status: 500, msg: "Failed to confirm booking completion", data: null };
  }
};

/**
 * Cancel booking
 */
const cancelBooking = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { bookingId } = req.params;
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    const result = await bookingService.cancelBooking(userId, bookingId);
    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Cancel booking error:", error);
    return { status: 500, msg: "Failed to cancel booking", data: null };
  }
};


const submitQuote = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) return { status: 401, msg: "Unauthorized: user not found", data: null };
    const { bookingId } = req.params;
    const { quotedPrice, quoteNote } = req.body;
    if (!bookingId) return { status: 400, msg: "Booking ID is required", data: null };
    if (!quotedPrice) return { status: 400, msg: "Quoted price is required", data: null };
    const result = await bookingService.submitQuote(userId, bookingId, quotedPrice, quoteNote);
    return { status: result.status, msg: result.msg, data: result.data };
  } catch (error) {
    console.error("Submit quote error:", error);
    return { status: 500, msg: "Failed to submit quote", data: null };
  }
};

const respondToQuote = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) return { status: 401, msg: "Unauthorized: user not found", data: null };
    const { bookingId } = req.params;
    const { accepted } = req.body;
    if (!bookingId) return { status: 400, msg: "Booking ID is required", data: null };
    if (accepted === undefined || accepted === null) return { status: 400, msg: "accepted (true/false) is required", data: null };
    const result = await bookingService.respondToQuote(userId, bookingId, Boolean(accepted));
    return { status: result.status, msg: result.msg, data: result.data };
  } catch (error) {
    console.error("Respond to quote error:", error);
    return { status: 500, msg: "Failed to process quote response", data: null };
  }
};

export default {
  bookNow,
  getBookingById,
  getUserBookings,
  acceptBooking,
  updateBookingStatus,
  confirmBookingCompletion,
  cancelBooking,
  submitQuote,
  respondToQuote,
};

