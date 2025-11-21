import * as reviewService from '../services/reviewService.js';

/**
 * Create a review for a completed booking
 * Requires: bookingId, rating, review_text (optional) in request body
 */
const createReview = async (req) => {
  try {
    const userId = req.user?.id; // from verifyToken middleware
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { bookingId } = req.params;
    const { rating, review_text } = req.body;

    // Validation
    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    if (!rating) {
      return { status: 400, msg: "Rating is required", data: null };
    }

    const result = await reviewService.createReview(userId, bookingId, {
      rating,
      review_text: review_text || null
    });

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Create review error:", error);
    return { status: 500, msg: "Failed to create review", data: null };
  }
};

/**
 * Get reviews for a seller
 */
const getSellerReviews = async (req) => {
  try {
    const { sellerId } = req.params;

    if (!sellerId) {
      return { status: 400, msg: "Seller ID is required", data: null };
    }

    const result = await reviewService.getSellerReviews(sellerId);

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Get seller reviews error:", error);
    return { status: 500, msg: "Failed to retrieve reviews", data: null };
  }
};

/**
 * Check if user has already reviewed a booking
 */
const checkExistingReview = async (req) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return { status: 401, msg: "Unauthorized: user not found", data: null };
    }

    const { bookingId } = req.params;

    if (!bookingId) {
      return { status: 400, msg: "Booking ID is required", data: null };
    }

    const result = await reviewService.checkExistingReview(userId, bookingId);

    return {
      status: result.status,
      msg: result.msg,
      data: result.data
    };
  } catch (error) {
    console.error("Check existing review error:", error);
    return { status: 500, msg: "Failed to check for existing review", data: null };
  }
};

export default {
  createReview,
  getSellerReviews,
  checkExistingReview
};

