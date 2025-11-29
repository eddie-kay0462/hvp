import { supabase, supabaseAdmin } from '../config/supabase.js';

export const getInvoiceById = async (userId, invoiceId) => {
  try {
    if (!invoiceId) {
      return { status: 400, msg: 'Invoice ID is required', data: null };
    }

    // Use admin client to avoid RLS issues
    const db = supabaseAdmin || supabase;

    // Fetch invoice with booking and service details
    const { data: invoice, error } = await db
      .from('invoices')
      .select(`
        id,
        invoice_number,
        amount,
        currency,
        paystack_reference,
        created_at,
        buyer_id,
        booking:bookings (
          id,
          service_id,
          payment_amount,
          payment_status,
          payment_captured_at,
          created_at
        ),
        service:services (
          id,
          title,
          description,
          default_price,
          category
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      return { status: 404, msg: 'Invoice not found', data: null };
    }

    // Validate ownership: support projects where buyer_id might be profile.id or auth.users.id
    let ownsInvoice = invoice.buyer_id === userId;
    if (!ownsInvoice) {
      // Try resolve user's profile id and compare
      try {
        const { data: profile } = await db
          .from('profiles')
          .select('id, user_id')
          .or(`id.eq.${userId},user_id.eq.${userId}`)
          .limit(1)
          .single();
        if (profile?.id && invoice.buyer_id === profile.id) {
          ownsInvoice = true;
        }
      } catch {
        // ignore, fallback to previous
      }
    }
    
    if (!ownsInvoice) {
      return { status: 403, msg: 'You do not have permission to view this invoice', data: null };
    }

    // Optionally, fetch buyer profile name for display
    let buyerProfile = null;
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', invoice.buyer_id)
        .single();
      buyerProfile = profile || null;
    } catch {}

    return {
      status: 200,
      msg: 'Invoice retrieved successfully',
      data: { ...invoice, buyer_profile: buyerProfile }
    };
  } catch (e) {
    console.error('getInvoiceById error:', e);
    return { status: 500, msg: 'Failed to retrieve invoice', data: null };
  }
};


