import { supabase } from '../config/supabase.js';

/**
 * Create a review for a completed booking
 * @param {string} userId - Reviewer's user ID (buyer)
 * @param {string} bookingId - Booking ID
 * @param {Object} reviewData - Review data (rating, review_text)
 * @returns {Promise<Object>} Review result
 */
export const createReview = async (userId, bookingId, reviewData) => {
  try {
    if (!userId || !bookingId) {
      return { status: 400, msg: "User ID and Booking ID are required", data: null };
    }

    const { rating, review_text } = reviewData;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return { status: 400, msg: "Rating must be between 1 and 5", data: null };
    }

    // Get the booking to verify it exists and is completed
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        buyer_id,
        service_id,
        status,
        service:services (
          id,
          user_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: "Booking not found", data: null };
    }

    // Verify user is the buyer
    if (booking.buyer_id !== userId) {
      return { status: 403, msg: "Only the buyer can leave a review for this booking", data: null };
    }

    // Verify booking is completed
    if (booking.status !== 'completed') {
      return { status: 400, msg: "You can only leave a review for completed bookings", data: null };
    }

    // Check if user has already reviewed this booking
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', userId)
      .eq('service_id', booking.service_id)
      .eq('reviewee_id', booking.service.user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      console.error("Error checking for existing review:", checkError);
      return { status: 500, msg: "Failed to check for existing review", data: null };
    }

    if (existingReview) {
      return { status: 409, msg: "You have already left a review for this booking", data: null };
    }

    // Create the review
    const reviewDataToInsert = {
      reviewer_id: userId,
      reviewee_id: booking.service.user_id, // The seller
      service_id: booking.service_id,
      rating: parseInt(rating),
      review_text: review_text || null,
    };

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert(reviewDataToInsert)
      .select()
      .single();

    if (reviewError) {
      console.error("Review creation error:", reviewError);
      return { status: 400, msg: reviewError.message || "Failed to create review", data: null };
    }

    return {
      status: 201,
      msg: "Review created successfully",
      data: review
    };
  } catch (e) {
    console.error("createReview error:", e);
    return { status: 500, msg: "Failed to create review", data: null };
  }
};

/**
 * Get reviews for a seller
 * @param {string} sellerId - Seller's user ID
 * @returns {Promise<Object>} List of reviews
 */
export const getSellerReviews = async (sellerId) => {
  try {
    if (!sellerId) {
      return { status: 400, msg: "Seller ID is required", data: null };
    }

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        review_text,
        created_at,
        reviewer_id,
        service_id,
        reviewer:profiles!reviews_reviewer_id_fkey (
          id,
          first_name,
          last_name,
          profile_pic
        )
      `)
      .eq('reviewee_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      return { status: 400, msg: error.message, data: null };
    }

    return {
      status: 200,
      msg: "Reviews retrieved successfully",
      data: { reviews: reviews || [] }
    };
  } catch (e) {
    console.error("getSellerReviews error:", e);
    return { status: 500, msg: "Failed to retrieve reviews", data: null };
  }
};

/**
 * Check if user has already reviewed a booking
 * @param {string} userId - User ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Review check result
 */
export const checkExistingReview = async (userId, bookingId) => {
  try {
    if (!userId || !bookingId) {
      return { status: 400, msg: "User ID and Booking ID are required", data: null };
    }

    // Get booking to find service and seller
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        service_id,
        service:services (user_id)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { status: 404, msg: "Booking not found", data: null };
    }

    // Check if review exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, rating, review_text, created_at')
      .eq('reviewer_id', userId)
      .eq('service_id', booking.service_id)
      .eq('reviewee_id', booking.service.user_id)
      .single();

    if (reviewError) {
      if (reviewError.code === 'PGRST116') {
        // No review found
        return { status: 200, msg: "No review found", data: { hasReview: false, review: null } };
      }
      return { status: 400, msg: reviewError.message, data: null };
    }

    return {
      status: 200,
      msg: "Review found",
      data: { hasReview: true, review }
    };
  } catch (e) {
    console.error("checkExistingReview error:", e);
    return { status: 500, msg: "Failed to check for existing review", data: null };
  }
};

