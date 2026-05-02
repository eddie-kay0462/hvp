import nodemailer from 'nodemailer';
import { supabase, supabaseAdmin } from '../config/supabase.js';

// ---------------------------------------------------------------------------
// Zoho Mail SMTP transport
// Credentials come from environment variables — never hardcode them.
// ---------------------------------------------------------------------------

const SMTP_PORT = parseInt(process.env.ZOHO_SMTP_PORT || '587');

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  requireTLS: SMTP_PORT === 587,
  auth: {
    user: process.env.ZOHO_SMTP_USER,
    pass: process.env.ZOHO_SMTP_PASS,
  },
});

const FROM_NAME = 'Hustle Village';
const FROM_ADDRESS = process.env.ZOHO_SMTP_USER;

const getFrontendUrl = () => process.env.FRONTEND_URL || 'https://hustlevillage.app';

function getAdminEmail() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    console.warn('[email] ADMIN_EMAIL env var is not set — admin notifications will not be delivered.');
  }
  return email || 'admin@hustlevillage.app';
}

// ---------------------------------------------------------------------------
// Shared send helper — Zoho SMTP
// ---------------------------------------------------------------------------

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject,
    html,
    text,
  });
}

// ---------------------------------------------------------------------------
// 1. Service approved → notify seller
// ---------------------------------------------------------------------------

export const sendServiceApprovalEmail = async (sellerEmail, sellerName, service) => {
  try {
    const frontendUrl = getFrontendUrl();
    const serviceUrl   = `${frontendUrl}/service/${service.id}`;
    const dashboardUrl = `${frontendUrl}/seller/services`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .service-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Congratulations!</h1></div>
          <div class="content">
            <p>Hi ${sellerName || 'there'},</p>
            <p>Your service has been reviewed and <strong>approved</strong> by our team. It's now live on Hustle Village!</p>
            <div class="service-info">
              <h3>${service.title}</h3>
              <p>${service.description}</p>
              <p><strong>Category:</strong> ${service.category}</p>
              <p><strong>Price:</strong> GH&#8373; ${service.default_price ?? 'N/A'}</p>
            </div>
            <p>Customers can start booking your service right away.</p>
            <p style="text-align:center;">
              <a href="${serviceUrl}" class="button">View Your Service</a>
              <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </p>
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Monitor your bookings in the seller dashboard</li>
              <li>Respond quickly to customer inquiries</li>
              <li>Deliver quality service to earn great reviews</li>
            </ul>
            <p>Best regards,<br>The Hustle Village Team</p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village. All rights reserved.</p></div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${sellerName || 'there'},

Your service "${service.title}" has been approved and is now live on Hustle Village!

Category: ${service.category}
Price: GH₵ ${service.default_price ?? 'N/A'}

View your service: ${serviceUrl}
Go to dashboard: ${dashboardUrl}

Best regards,
The Hustle Village Team
    `.trim();

    const info = await sendMail({
      to: sellerEmail,
      subject: 'Your service has been approved!',
      html,
      text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send approval email:', error.message);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 2. Service rejected → notify seller with reason
// ---------------------------------------------------------------------------

export const sendServiceRejectionEmail = async (sellerEmail, sellerName, service, rejectionReason) => {
  try {
    const frontendUrl    = getFrontendUrl();
    const editServiceUrl = `${frontendUrl}/seller/services`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .service-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .reason-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Service Review Update</h1></div>
          <div class="content">
            <p>Hi ${sellerName || 'there'},</p>
            <p>Thank you for submitting your service. After reviewing it, our team needs you to make some updates before we can approve it.</p>
            <div class="service-info">
              <h3>${service.title}</h3>
              <p><strong>Category:</strong> ${service.category}</p>
            </div>
            <div class="reason-box">
              <h4>Feedback from our team:</h4>
              <p>${rejectionReason}</p>
            </div>
            <p><strong>Next steps:</strong></p>
            <ol>
              <li>Review the feedback above</li>
              <li>Update your service listing</li>
              <li>Resubmit for approval</li>
            </ol>
            <p style="text-align:center;">
              <a href="${editServiceUrl}" class="button">Edit Your Service</a>
            </p>
            <p>Best regards,<br>The Hustle Village Team</p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village. All rights reserved.</p></div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${sellerName || 'there'},

Your service "${service.title}" needs some updates before it can be approved.

Feedback from our team:
${rejectionReason}

Edit your service: ${editServiceUrl}

Best regards,
The Hustle Village Team
    `.trim();

    const info = await sendMail({
      to: sellerEmail,
      subject: 'Your service needs some updates',
      html,
      text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send rejection email:', error.message);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 3. New service submitted → alert admin
// ---------------------------------------------------------------------------

export const sendServiceSubmittedNotification = async (service, sellerEmail, sellerName) => {
  try {
    const frontendUrl      = getFrontendUrl();
    const adminDashboardUrl = `${frontendUrl}/admin/services/pending`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .service-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>New Service Submission</h1></div>
          <div class="content">
            <p>Hi Admin,</p>
            <p>A new service has been submitted and is awaiting your approval.</p>
            <div class="service-info">
              <h3>${service.title}</h3>
              <p>${service.description}</p>
              <p><strong>Category:</strong> ${service.category}</p>
              <p><strong>Price:</strong> GH&#8373; ${service.default_price ?? 'N/A'}</p>
              <p><strong>Seller:</strong> ${sellerName}</p>
              <p><strong>Email:</strong> ${sellerEmail}</p>
            </div>
            <p style="text-align:center;">
              <a href="${adminDashboardUrl}" class="button">Review Service</a>
            </p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village. All rights reserved.</p></div>
        </div>
      </body>
      </html>
    `;

    const text = `
New Service Submission

Service: ${service.title}
Category: ${service.category}
Price: GH₵ ${service.default_price ?? 'N/A'}
Seller: ${sellerName} (${sellerEmail})

Review: ${adminDashboardUrl}
    `.trim();

    const info = await sendMail({
      to: getAdminEmail(),
      subject: 'New Service Pending Approval',
      html,
      text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send admin notification:', error.message);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// MoMo manual payments — admin alert + buyer confirmation
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  if (s == null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function resolveBuyerContact(profileId) {
  if (!profileId) {
    return { email: null, name: 'there' };
  }
  const db = supabaseAdmin || supabase;
  const { data: profile } = await db
    .from('profiles')
    .select('first_name, last_name, email, user_id')
    .eq('id', profileId)
    .maybeSingle();

  const name =
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'there';

  let email = profile?.email || null;

  if (!email && supabaseAdmin) {
    const authUserId = profile?.user_id || profileId;
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(authUserId);
    if (!authErr && authData?.user?.email) {
      email = authData.user.email;
    }
  }

  return { email, name };
}

/**
 * Alert admin that a buyer submitted MoMo proof (queued for verification).
 */
export const sendMomoProofSubmittedToAdmin = async ({
  bookingId,
  serviceTitle,
  amountGhs,
  momoTransactionId,
  buyerName,
}) => {
  try {
    const frontendUrl = getFrontendUrl();
    const adminQueueUrl = `${frontendUrl.replace(/\/+$/, '')}/admin/payments/momo`;
    const bookingUrl = `${frontendUrl.replace(/\/+$/, '')}/booking/${bookingId}`;
    const amt = Number(amountGhs ?? 0).toFixed(2);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 16px 0; }
          .box { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 16px; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1 style="margin:0;font-size:22px;">MoMo payment proof submitted</h1></div>
          <div class="content">
            <p>A buyer submitted a Mobile Money receipt for verification.</p>
            <div class="box">
              <p><strong>Service:</strong> ${escapeHtml(serviceTitle || 'Service')}</p>
              <p><strong>Amount:</strong> GH&#8373; ${escapeHtml(amt)}</p>
              <p><strong>MoMo transaction ID:</strong> ${escapeHtml(momoTransactionId || '—')}</p>
              <p><strong>Buyer:</strong> ${escapeHtml(buyerName || 'Buyer')}</p>
              <p><strong>Booking ID:</strong> <code>${escapeHtml(bookingId)}</code></p>
            </div>
            <p style="text-align:center;">
              <a href="${adminQueueUrl}" class="button">Open verification queue</a>
            </p>
            <p style="font-size:13px;color:#666;"><a href="${bookingUrl}">View booking</a></p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div>
        </div>
      </body>
      </html>
    `;

    const text = `
MoMo payment proof submitted

Service: ${serviceTitle || 'Service'}
Amount: GH₵ ${amt}
MoMo transaction ID: ${momoTransactionId || '—'}
Buyer: ${buyerName || 'Buyer'}
Booking: ${bookingId}

Verification queue: ${adminQueueUrl}
Booking: ${bookingUrl}
    `.trim();

    const info = await sendMail({
      to: getAdminEmail(),
      subject: `[Hustle Village] MoMo proof pending — ${serviceTitle || bookingId.slice(0, 8)}`,
      html,
      text,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendMomoProofSubmittedToAdmin failed:', error.message);
    return { sent: false, error: error.message };
  }
};

/**
 * Notify buyer that MoMo payment was approved.
 */
export const sendMomoPaymentApprovedToBuyer = async (
  buyerProfileId,
  { bookingId, serviceTitle, amountGhs, invoiceId }
) => {
  try {
    const { email, name } = await resolveBuyerContact(buyerProfileId);
    if (!email) {
      console.warn('[email] MoMo approved: no buyer email for profile', buyerProfileId);
      return { sent: false, reason: 'no_email' };
    }

    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const invoiceUrl = invoiceId ? `${frontendUrl}/invoice/${invoiceId}` : null;
    const invoiceHint = invoiceUrl
      ? `<p>You can view your invoice here: <a href="${invoiceUrl}">${invoiceUrl}</a></p>`
      : '';

    const amt = Number(amountGhs ?? 0).toFixed(2);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 16px 0; }
          .footer { text-align: center; padding: 16px; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1 style="margin:0;font-size:22px;">Payment confirmed</h1></div>
          <div class="content">
            <p>Hi ${escapeHtml(name)},</p>
            <p>Good news — we verified your Mobile Money payment for <strong>${escapeHtml(serviceTitle || 'your booking')}</strong> (GH&#8373; ${escapeHtml(amt)}).</p>
            ${invoiceHint}
            <p style="text-align:center;">
              <a href="${bookingUrl}" class="button">View booking</a>
            </p>
            <p>Thank you for using Hustle Village.</p>
            <p>Best,<br>The Hustle Village Team</p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div>
        </div>
      </body>
      </html>
    `;

    const invoiceLine = invoiceUrl ? `\nInvoice: ${invoiceUrl}\n` : '';

    const text = `
Hi ${name},

Your Mobile Money payment for "${serviceTitle || 'your booking'}" (GH₵ ${amt}) has been confirmed.
${invoiceLine}
View your booking: ${bookingUrl}

Best,
The Hustle Village Team
    `.trim();

    const info = await sendMail({
      to: email,
      subject: 'Your payment was confirmed — Hustle Village',
      html,
      text,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendMomoPaymentApprovedToBuyer failed:', error.message);
    return { sent: false, error: error.message };
  }
};

/**
 * Notify buyer that MoMo proof was rejected; they can resubmit.
 */
export const sendMomoPaymentRejectedToBuyer = async (
  buyerProfileId,
  { bookingId, serviceTitle, rejectionReason }
) => {
  try {
    const { email, name } = await resolveBuyerContact(buyerProfileId);
    if (!email) {
      console.warn('[email] MoMo rejected: no buyer email for profile', buyerProfileId);
      return { sent: false, reason: 'no_email' };
    }

    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const reasonHtml = escapeHtml(rejectionReason || 'Please submit a new transaction ID and receipt screenshot.');
    const reasonText = (rejectionReason || 'Please submit a new transaction ID and receipt screenshot.').trim();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #b45309; color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 16px 0; }
          .reason-box { background: #fffbeb; border-left: 4px solid #b45309; padding: 14px; margin: 16px 0; }
          .footer { text-align: center; padding: 16px; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1 style="margin:0;font-size:22px;">Payment verification update</h1></div>
          <div class="content">
            <p>Hi ${escapeHtml(name)},</p>
            <p>We could not verify your Mobile Money payment for <strong>${escapeHtml(serviceTitle || 'your booking')}</strong> with the details you submitted.</p>
            <div class="reason-box">
              <p style="margin:0;"><strong>Note from our team:</strong></p>
              <p style="margin:8px 0 0 0;">${reasonHtml}</p>
            </div>
            <p>Open your booking, tap <strong>Pay Now</strong> again, and submit a new transaction ID and receipt screenshot.</p>
            <p style="text-align:center;">
              <a href="${bookingUrl}" class="button">Go to booking</a>
            </p>
            <p>Best,<br>The Hustle Village Team</p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${name},

We could not verify your Mobile Money payment for "${serviceTitle || 'your booking'}".

Note from our team:
${reasonText}

Please open your booking and submit a new transaction ID and screenshot:
${bookingUrl}

Best,
The Hustle Village Team
    `.trim();

    const info = await sendMail({
      to: email,
      subject: 'Action needed: payment verification — Hustle Village',
      html,
      text,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendMomoPaymentRejectedToBuyer failed:', error.message);
    return { sent: false, error: error.message };
  }
};
