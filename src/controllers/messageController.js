import { supabase, supabaseAdmin } from '../config/supabase.js';
import { sendNewMessageNotification } from '../services/emailService.js';

const NOTIFY_COOLDOWN_MINUTES = 60;

/**
 * POST /api/messages/notify
 * Called by Supabase Database Webhook on messages INSERT.
 * Secured with WEBHOOK_SECRET env var checked against Authorization header.
 */
export const notify = async (req, res) => {
  // Verify webhook secret
  const authHeader = req.headers['authorization'] || '';
  const secret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ status: 401, msg: 'Unauthorized', data: null });
  }

  // Supabase DB Webhook payload shape: { type, table, schema, record, old_record }
  const { type, record: message } = req.body;

  if (type !== 'INSERT' || !message?.id) {
    return res.status(200).json({ status: 200, msg: 'ignored', data: null });
  }

  // Ignore empty messages (attachments-only handled separately)
  if (!message.conversation_id || !message.sender_id) {
    return res.status(200).json({ status: 200, msg: 'missing fields', data: null });
  }

  try {
    const db = supabaseAdmin || supabase;

    // Resolve the other participant (recipient)
    const { data: conv } = await db
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', message.conversation_id)
      .single();

    if (!conv) {
      return res.status(200).json({ status: 200, msg: 'conversation not found', data: null });
    }

    const recipientId =
      conv.participant1_id === message.sender_id
        ? conv.participant2_id
        : conv.participant1_id;

    // Fetch recipient profile — check opt-out flag
    const { data: recipientProfile } = await db
      .from('profiles')
      .select('first_name, last_name, email, email_notifications_enabled')
      .eq('id', recipientId)
      .single();

    if (recipientProfile?.email_notifications_enabled === false) {
      return res.status(200).json({ status: 200, msg: 'notifications disabled', data: null });
    }

    // Resolve recipient email (profile → auth fallback)
    let recipientEmail = recipientProfile?.email || null;
    if (!recipientEmail && supabaseAdmin) {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(recipientId);
      recipientEmail = authData?.user?.email || null;
    }

    if (!recipientEmail) {
      console.warn('[messages/notify] no email for recipient', recipientId);
      return res.status(200).json({ status: 200, msg: 'no recipient email', data: null });
    }

    // Throttle: skip if we already notified this recipient for this conversation within the cooldown window
    const cutoff = new Date(Date.now() - NOTIFY_COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { count } = await db
      .from('message_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', message.conversation_id)
      .eq('recipient_id', recipientId)
      .gte('sent_at', cutoff);

    if (count > 0) {
      return res.status(200).json({ status: 200, msg: 'throttled', data: null });
    }

    // Resolve sender name
    const { data: senderProfile } = await db
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', message.sender_id)
      .single();

    const senderName =
      `${senderProfile?.first_name || ''} ${senderProfile?.last_name || ''}`.trim() || 'Someone';
    const recipientName =
      `${recipientProfile?.first_name || ''} ${recipientProfile?.last_name || ''}`.trim() || 'there';

    // Send the email
    const result = await sendNewMessageNotification(
      recipientEmail,
      recipientName,
      senderName,
      message.conversation_id,
      message.content || null
    );

    if (result.sent) {
      await db.from('message_notifications').insert({
        conversation_id: message.conversation_id,
        recipient_id: recipientId,
      });
      console.log('[messages/notify] sent to', recipientEmail, '| conversation', message.conversation_id);
    } else {
      console.warn('[messages/notify] email failed:', result.error);
    }

    return res.status(200).json({ status: 200, msg: result.sent ? 'sent' : 'email_failed', data: null });
  } catch (error) {
    console.error('[messages/notify] unexpected error:', error.message);
    return res.status(500).json({ status: 500, msg: 'Internal error', data: null });
  }
};

export default { notify };
