import { supabase, supabaseAdmin } from '../config/supabase.js';

const db = supabaseAdmin ?? supabase;

/**
 * Seller sends a custom offer inside a conversation.
 * Creates a message row with offer_data + offer_status='pending'.
 */
const sendOffer = async (req) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) return { status: 401, msg: 'Unauthorized', data: null };

    const { conversationId, price, note } = req.body;

    if (!conversationId || !price || isNaN(Number(price)) || Number(price) <= 0) {
      return { status: 400, msg: 'conversationId and a positive price are required', data: null };
    }

    // Verify conversation exists and the caller is the seller of the linked service
    const { data: conv, error: convErr } = await db
      .from('conversations')
      .select('id, participant1_id, participant2_id, service_id')
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) return { status: 404, msg: 'Conversation not found', data: null };

    // The seller must be a participant
    if (conv.participant1_id !== sellerId && conv.participant2_id !== sellerId) {
      return { status: 403, msg: 'Not a participant in this conversation', data: null };
    }

    // The caller must own the linked service
    if (conv.service_id) {
      const { data: svc } = await db
        .from('services')
        .select('user_id, title')
        .eq('id', conv.service_id)
        .single();

      if (!svc || svc.user_id !== sellerId) {
        return { status: 403, msg: 'Only the seller of this service can send offers', data: null };
      }

      const offerData = {
        price: Number(price),
        note: note?.trim() || null,
        service_id: conv.service_id,
        service_title: svc.title,
      };

      const { data: msg, error: msgErr } = await db
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: sellerId,
          content: '',
          offer_data: offerData,
          offer_status: 'pending',
        })
        .select()
        .single();

      if (msgErr) {
        console.error('sendOffer insert error:', msgErr);
        return { status: 500, msg: 'Failed to send offer', data: null };
      }

      return { status: 201, msg: 'Offer sent', data: msg };
    }

    return { status: 400, msg: 'This conversation has no linked service', data: null };
  } catch (err) {
    console.error('sendOffer error:', err);
    return { status: 500, msg: 'Failed to send offer', data: null };
  }
};

/**
 * Buyer accepts or declines an offer.
 * On accept: creates a booking with the offer price.
 */
const respondToOffer = async (req) => {
  try {
    const buyerId = req.user?.id;
    if (!buyerId) return { status: 401, msg: 'Unauthorized', data: null };

    const { messageId, accepted } = req.body;
    if (!messageId || typeof accepted !== 'boolean') {
      return { status: 400, msg: 'messageId and accepted (boolean) are required', data: null };
    }

    // Fetch the offer message
    const { data: msg, error: msgErr } = await db
      .from('messages')
      .select('id, sender_id, conversation_id, offer_data, offer_status')
      .eq('id', messageId)
      .single();

    if (msgErr || !msg) return { status: 404, msg: 'Offer not found', data: null };
    if (msg.offer_status !== 'pending') {
      return { status: 409, msg: 'This offer has already been responded to', data: null };
    }
    // Buyer cannot be the offer sender
    if (msg.sender_id === buyerId) {
      return { status: 403, msg: 'You cannot respond to your own offer', data: null };
    }

    const newStatus = accepted ? 'accepted' : 'declined';
    const { error: updateErr } = await db
      .from('messages')
      .update({ offer_status: newStatus })
      .eq('id', messageId);

    if (updateErr) {
      console.error('respondToOffer update error:', updateErr);
      return { status: 500, msg: 'Failed to update offer status', data: null };
    }

    if (!accepted) {
      return { status: 200, msg: 'Offer declined', data: { offer_status: 'declined' } };
    }

    // Accept path — create booking with the offer price
    const offerData = msg.offer_data;
    const serviceId = offerData?.service_id;
    const offerPrice = offerData?.price;

    if (!serviceId || !offerPrice) {
      return { status: 400, msg: 'Offer data is incomplete', data: null };
    }

    // Fetch buyer profile
    const { data: buyerProfile } = await db
      .from('profiles')
      .select('id')
      .eq('id', buyerId)
      .single();

    if (!buyerProfile) return { status: 404, msg: 'Buyer profile not found', data: null };

    // Fetch service
    const { data: svc } = await db
      .from('services')
      .select('id, is_active, is_verified, user_id')
      .eq('id', serviceId)
      .single();

    if (!svc) return { status: 404, msg: 'Service not found', data: null };

    // Create the booking with the custom offer price
    const { data: booking, error: bookErr } = await db
      .from('bookings')
      .insert({
        buyer_id: buyerProfile.id,
        service_id: serviceId,
        status: 'pending',
        payment_status: null,
        payment_amount: offerPrice,
      })
      .select()
      .single();

    if (bookErr) {
      console.error('respondToOffer booking error:', bookErr);
      return { status: 500, msg: 'Failed to create booking from offer', data: null };
    }

    return {
      status: 201,
      msg: 'Offer accepted — booking created',
      data: { offer_status: 'accepted', booking },
    };
  } catch (err) {
    console.error('respondToOffer error:', err);
    return { status: 500, msg: 'Failed to respond to offer', data: null };
  }
};

export default { sendOffer, respondToOffer };
