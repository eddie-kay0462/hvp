import nodemailer from 'nodemailer';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const FROM_NAME = 'Hustle Village';
const FROM_ADDRESS = process.env.ZOHO_SMTP_USER || process.env.FROM_EMAIL || 'noreply@hustlevillage.app';

const getFrontendUrl = () => process.env.FRONTEND_URL || 'https://hustlevillage.app';

function getAdminEmail() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    console.warn('[email] ADMIN_EMAIL env var is not set — admin notifications will not be delivered.');
  }
  return email || 'admin@hustlevillage.app';
}

function formatServicePrice(service) {
  if (service.pricing_type === 'range') {
    return `GH₵ ${service.price_min} – GH₵ ${service.price_max}`;
  }
  if (service.pricing_type === 'packages' && Array.isArray(service.service_packages) && service.service_packages.length > 0) {
    const min = Math.min(...service.service_packages.map(p => Number(p.price)));
    return `From GH₵ ${min} (${service.service_packages.length} packages)`;
  }
  return service.default_price != null ? `GH₵ ${service.default_price}` : 'N/A';
}

// ---------------------------------------------------------------------------
// Shared send helper — uses Resend (HTTP) if RESEND_API_KEY is set,
// otherwise falls back to Zoho SMTP.
// ---------------------------------------------------------------------------

async function sendMail({ to, subject, html, text }) {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${process.env.FROM_EMAIL || 'noreply@hustlevillage.app'}>`,
      to,
      subject,
      html,
      text,
    });
    if (error) throw new Error(error.message);
    return { messageId: `resend-${Date.now()}` };
  }

  // Zoho SMTP fallback
  const SMTP_PORT = parseInt(process.env.ZOHO_SMTP_PORT || '465');
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
              <p><strong>Price:</strong> ${formatServicePrice(service)}</p>
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
Price: ${formatServicePrice(service)}

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
              <p><strong>Price:</strong> ${formatServicePrice(service)}</p>
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
Price: ${formatServicePrice(service)}
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
// Shared contact resolvers
// ---------------------------------------------------------------------------

async function resolveSellerContact(sellerAuthUserId) {
  if (!sellerAuthUserId) return { email: null, name: 'there' };
  const db = supabaseAdmin || supabase;
  // profiles.id IS the auth user ID (1:1 FK relationship)
  const { data: profile } = await db
    .from('profiles')
    .select('first_name, last_name, email, phone')
    .eq('id', sellerAuthUserId)
    .maybeSingle();
  const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'there';
  let email = profile?.email || null;
  if (!email && supabaseAdmin) {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(sellerAuthUserId);
    email = authData?.user?.email || null;
  }
  return { email, name, phone: profile?.phone || null };
}

// ---------------------------------------------------------------------------
// 4. New booking → notify seller
// ---------------------------------------------------------------------------

export const sendNewBookingToSeller = async (sellerAuthUserId, { bookingId, serviceTitle, buyerName }) => {
  try {
    const { email, name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    if (!email) {
      console.warn('[email] sendNewBookingToSeller: no email for seller', sellerAuthUserId);
      return { sent: false, reason: 'no_email' };
    }

    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const dashboardUrl = `${frontendUrl}/seller/bookings`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 16px 0; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1 style="margin:0;">New Booking!</h1></div>
          <div class="content">
            <p>Hi ${escapeHtml(sellerName)},</p>
            <p>You have a new booking on Hustle Village.</p>
            <div class="box">
              <p><strong>Service:</strong> ${escapeHtml(serviceTitle || 'Your service')}</p>
              <p><strong>Booked by:</strong> ${escapeHtml(buyerName || 'A customer')}</p>
            </div>
            <p>Log in to accept or review the booking details.</p>
            <p style="text-align:center;">
              <a href="${bookingUrl}" class="button">View Booking</a>
            </p>
            <p style="font-size:13px;color:#666;">Or go to your <a href="${dashboardUrl}">bookings dashboard</a>.</p>
            <p>Best regards,<br>The Hustle Village Team</p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village. All rights reserved.</p></div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${sellerName},

You have a new booking on Hustle Village.

Service: ${serviceTitle || 'Your service'}
Booked by: ${buyerName || 'A customer'}

View the booking: ${bookingUrl}

Best regards,
The Hustle Village Team
    `.trim();

    const info = await sendMail({
      to: email,
      subject: `New booking — ${serviceTitle || 'Hustle Village'}`,
      html,
      text,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendNewBookingToSeller failed:', error.message);
    return { sent: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// 5. Booking accepted → notify buyer
// ---------------------------------------------------------------------------

export const sendBookingAcceptedToBuyer = async (buyerProfileId, sellerAuthUserId, { bookingId, serviceTitle }) => {
  try {
    const { email, name: buyerName } = await resolveBuyerContact(buyerProfileId);
    if (!email) return { sent: false, reason: 'no_email' };
    const { name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.box{background:white;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #e5e7eb}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Booking Accepted!</h1></div><div class="content"><p>Hi ${escapeHtml(buyerName)},</p><p>Great news — <strong>${escapeHtml(sellerName)}</strong> has accepted your booking for <strong>${escapeHtml(serviceTitle || 'your service')}</strong>.</p><p>The next step is to <strong>log in and complete your payment</strong> to confirm the booking and get things moving.</p><p style="text-align:center"><a href="${bookingUrl}" class="button">Log In &amp; Pay Now</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${buyerName},\n\n${sellerName} has accepted your booking for "${serviceTitle || 'your service'}".\n\nThe next step is to log in and complete your payment to confirm the booking.\n\nPay now: ${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Your booking has been accepted — Hustle Village`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendBookingAcceptedToBuyer failed:', error.message);
    return { sent: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// 6. Booking delivered → notify buyer to confirm
// ---------------------------------------------------------------------------

export const sendBookingDeliveredToBuyer = async (buyerProfileId, { bookingId, serviceTitle }) => {
  try {
    const { email, name: buyerName } = await resolveBuyerContact(buyerProfileId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#2563eb;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Service Delivered</h1></div><div class="content"><p>Hi ${escapeHtml(buyerName)},</p><p>Your service <strong>${escapeHtml(serviceTitle || 'your booking')}</strong> has been marked as delivered.</p><p>Please review the work and confirm completion to release payment to the provider. If you have any issues, reach out before confirming.</p><p style="text-align:center"><a href="${bookingUrl}" class="button">Confirm Completion</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${buyerName},\n\nYour service "${serviceTitle || 'your booking'}" has been marked as delivered.\n\nPlease log in to confirm completion and release payment:\n${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Your service has been delivered — please confirm`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendBookingDeliveredToBuyer failed:', error.message);
    return { sent: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// 7. Payment released → notify seller
// ---------------------------------------------------------------------------

export const sendPaymentReleasedToSeller = async (sellerAuthUserId, { bookingId, serviceTitle, amountGhs }) => {
  try {
    const { email, name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const amt = Number(amountGhs ?? 0).toFixed(2);
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#059669;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#059669;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.box{background:white;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #e5e7eb}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Payment Released!</h1></div><div class="content"><p>Hi ${escapeHtml(sellerName)},</p><p>The buyer has confirmed completion of <strong>${escapeHtml(serviceTitle || 'your booking')}</strong>. Your payment of <strong>GH&#8373; ${escapeHtml(amt)}</strong> has been released.</p><div class="box"><p><strong>Service:</strong> ${escapeHtml(serviceTitle || '—')}</p><p><strong>Amount:</strong> GH&#8373; ${escapeHtml(amt)}</p></div><p style="text-align:center"><a href="${bookingUrl}" class="button">View Booking</a></p><p>Thank you for delivering great work on Hustle Village!</p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${sellerName},\n\nThe buyer confirmed completion of "${serviceTitle || 'your booking'}". Your payment of GH₵ ${amt} has been released.\n\nView booking: ${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Payment released — GH₵ ${amt}`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendPaymentReleasedToSeller failed:', error.message);
    return { sent: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// 8. MoMo payment approved → notify seller booking is now paid
// ---------------------------------------------------------------------------

export const sendMomoApprovedToSeller = async (sellerAuthUserId, { bookingId, serviceTitle, amountGhs }) => {
  try {
    const { email, name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const amt = Number(amountGhs ?? 0).toFixed(2);
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#059669;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#059669;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.box{background:white;padding:20px;border-radius:8px;margin:20px 0;border:1px solid #e5e7eb}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Booking Paid!</h1></div><div class="content"><p>Hi ${escapeHtml(sellerName)},</p><p>The Mobile Money payment for your booking <strong>${escapeHtml(serviceTitle || '')}</strong> has been verified and confirmed.</p><div class="box"><p><strong>Service:</strong> ${escapeHtml(serviceTitle || '—')}</p><p><strong>Amount:</strong> GH&#8373; ${escapeHtml(amt)}</p><p><strong>Status:</strong> Paid</p></div><p>You can now proceed with delivering the service. Payment will be released to you once the buyer confirms completion.</p><p style="text-align:center"><a href="${bookingUrl}" class="button">View Booking</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${sellerName},\n\nThe MoMo payment for "${serviceTitle || 'your booking'}" (GH₵ ${amt}) has been verified. You can now proceed.\n\nView booking: ${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Booking paid — proceed with "${serviceTitle || 'your booking'}"`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendMomoApprovedToSeller failed:', error.message);
    return { sent: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// 9. Payout required → alert admin to send money to provider
// ---------------------------------------------------------------------------

export const sendPayoutRequiredToAdmin = async (sellerAuthUserId, { bookingId, serviceTitle, amountGhs }) => {
  try {
    // resolveSellerContact now queries by profiles.id and returns phone too
    const { email: sellerEmail, name: sellerName, phone: sellerPhone } = await resolveSellerContact(sellerAuthUserId);

    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const amt = Number(amountGhs ?? 0).toFixed(2);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 16px 0; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 16px 0; border: 2px solid #7c3aed; }
          .label { color: #666; font-size: 13px; margin: 0; }
          .value { font-size: 16px; font-weight: bold; margin: 2px 0 12px 0; }
          .amount { font-size: 28px; font-weight: bold; color: #059669; }
          .footer { text-align: center; padding: 16px; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;font-size:22px;">⚡ Action Required — Process Provider Payout</h1>
          </div>
          <div class="content">
            <p>Hi Admin,</p>
            <p>A buyer has confirmed completion of a booking. You need to send the provider their payment via Mobile Money.</p>
            <div class="box">
              <p class="label">AMOUNT TO SEND</p>
              <p class="amount">GH₵ ${escapeHtml(amt)}</p>
              <p class="label">PROVIDER NAME</p>
              <p class="value">${escapeHtml(sellerName)}</p>
              <p class="label">PROVIDER PHONE (MoMo number)</p>
              <p class="value">${escapeHtml(sellerPhone || 'Not on file')}</p>
              <p class="label">PROVIDER EMAIL</p>
              <p class="value">${escapeHtml(sellerEmail || 'Not on file')}</p>
              <p class="label">SERVICE</p>
              <p class="value">${escapeHtml(serviceTitle || '—')}</p>
              <p class="label">BOOKING ID</p>
              <p class="value" style="font-size:13px;font-family:monospace;">${escapeHtml(bookingId)}</p>
            </div>
            <p style="text-align:center;">
              <a href="${bookingUrl}" class="button">View Booking</a>
            </p>
            <p style="font-size:13px;color:#888;">Once you have sent the money, no further action is needed in the system — the booking is already marked as completed.</p>
          </div>
          <div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div>
        </div>
      </body>
      </html>
    `;

    const text = `
ACTION REQUIRED — Process Provider Payout

Amount to send: GH₵ ${amt}
Provider: ${sellerName}
Phone (MoMo): ${sellerPhone || 'Not on file'}
Email: ${sellerEmail || 'Not on file'}
Service: ${serviceTitle || '—'}
Booking ID: ${bookingId}

View booking: ${bookingUrl}

Send the payment via MoMo to the provider's number above.
    `.trim();

    const info = await sendMail({
      to: getAdminEmail(),
      subject: `[Action Required] Pay ${sellerName} — GH₵ ${amt} for "${serviceTitle || 'booking'}"`,
      html,
      text,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendPayoutRequiredToAdmin failed:', error.message);
    return { sent: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// 10. Payout sent → notify provider
// ---------------------------------------------------------------------------

export const sendPayoutSentToProvider = async (sellerAuthUserId, { bookingId, serviceTitle, amountGhs, payoutTxnId }) => {
  try {
    const { email, name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/booking/${bookingId}`;
    const amt = Number(amountGhs ?? 0).toFixed(2);
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#059669;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#059669;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.box{background:white;padding:20px;border-radius:8px;margin:20px 0;border:2px solid #059669}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Payment Sent!</h1></div><div class="content"><p>Hi ${escapeHtml(sellerName)},</p><p>Great news — Hustle Village has sent your payment for <strong>${escapeHtml(serviceTitle || 'your booking')}</strong>.</p><div class="box"><p><strong>Amount:</strong> GH&#8373; ${escapeHtml(amt)}</p><p><strong>MoMo Transaction ID:</strong> <code>${escapeHtml(payoutTxnId || '—')}</code></p><p><strong>Service:</strong> ${escapeHtml(serviceTitle || '—')}</p></div><p>Please check your Mobile Money account to confirm you received the funds. If you have any issues, contact us.</p><p style="text-align:center"><a href="${bookingUrl}" class="button">View Booking</a></p><p>Thank you for your great work on Hustle Village!</p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${sellerName},\n\nHustle Village has sent your payment of GH₵ ${amt} for "${serviceTitle || 'your booking'}".\n\nMoMo Transaction ID: ${payoutTxnId || '—'}\n\nPlease check your Mobile Money account.\n\nView booking: ${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Your payment has been sent — GH₵ ${amt}`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendPayoutSentToProvider failed:', error.message);
    return { sent: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// 11. Booking cancelled → notify the other party
// ---------------------------------------------------------------------------

export const sendBookingCancelledToSeller = async (sellerAuthUserId, { serviceTitle, buyerName }) => {
  try {
    const { email, name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const dashboardUrl = `${frontendUrl}/seller/bookings`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#dc2626;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Booking Cancelled</h1></div><div class="content"><p>Hi ${escapeHtml(sellerName)},</p><p><strong>${escapeHtml(buyerName || 'The buyer')}</strong> has cancelled their booking for <strong>${escapeHtml(serviceTitle || 'your service')}</strong>.</p><p>No action is needed on your part. You can view your other bookings in your dashboard.</p><p style="text-align:center"><a href="${dashboardUrl}" class="button">Go to Dashboard</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${sellerName},\n\n${buyerName || 'The buyer'} has cancelled their booking for "${serviceTitle || 'your service'}".\n\nDashboard: ${dashboardUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Booking cancelled — ${serviceTitle || 'Hustle Village'}`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendBookingCancelledToSeller failed:', error.message);
    return { sent: false, error: error.message };
  }
};

export const sendBookingCancelledToBuyer = async (buyerProfileId, { serviceTitle }) => {
  try {
    const { email, name: buyerName } = await resolveBuyerContact(buyerProfileId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const servicesUrl = `${frontendUrl}/services`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#dc2626;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Booking Cancelled</h1></div><div class="content"><p>Hi ${escapeHtml(buyerName)},</p><p>Your booking for <strong>${escapeHtml(serviceTitle || 'a service')}</strong> has been cancelled by the provider.</p><p>We apologise for the inconvenience. You can browse other available services and make a new booking.</p><p style="text-align:center"><a href="${servicesUrl}" class="button">Browse Services</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${buyerName},\n\nYour booking for "${serviceTitle || 'a service'}" has been cancelled by the provider.\n\nBrowse other services: ${servicesUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Your booking was cancelled — Hustle Village`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendBookingCancelledToBuyer failed:', error.message);
    return { sent: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// RFQ (Request for Quote) notifications
// ---------------------------------------------------------------------------

export const sendQuoteRequestToSeller = async (sellerAuthUserId, { serviceTitle, buyerName, buyerRequirements }) => {
  try {
    const { email, name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/seller/bookings`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#7c3aed;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.requirements{background:#fff;border-left:4px solid #7c3aed;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0}.button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">New Quote Request</h1></div><div class="content"><p>Hi ${escapeHtml(sellerName)},</p><p><strong>${escapeHtml(buyerName)}</strong> has requested a quote for <strong>${escapeHtml(serviceTitle)}</strong>.</p><p><strong>What they need:</strong></p><div class="requirements">${escapeHtml(buyerRequirements || 'No additional details provided.')}</div><p>Log in to your dashboard to review the request and send a quote.</p><p style="text-align:center"><a href="${bookingUrl}" class="button">Send a Quote</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${sellerName},\n\n${buyerName} has requested a quote for "${serviceTitle}".\n\nWhat they need:\n${buyerRequirements || 'No additional details provided.'}\n\nLog in to send a quote: ${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `New quote request for ${serviceTitle}`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendQuoteRequestToSeller failed:', error.message);
    return { sent: false, error: error.message };
  }
};

export const sendQuoteSentToBuyer = async (buyerProfileId, { serviceTitle, quotedPrice, quoteNote }) => {
  try {
    const { email, name: buyerName } = await resolveBuyerContact(buyerProfileId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/bookings`;
    const formattedPrice = `GH₵${Number(quotedPrice).toFixed(2)}`;
    const noteHtml = quoteNote ? `<p><strong>Note from seller:</strong> ${escapeHtml(quoteNote)}</p>` : '';
    const noteText = quoteNote ? `\nNote from seller: ${quoteNote}\n` : '';
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#059669;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.price-box{background:#fff;border:2px solid #059669;border-radius:8px;padding:16px;text-align:center;margin:16px 0}.button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">You Have a Quote!</h1></div><div class="content"><p>Hi ${escapeHtml(buyerName)},</p><p>The seller has sent you a quote for <strong>${escapeHtml(serviceTitle)}</strong>.</p><div class="price-box"><p style="margin:0;font-size:13px;color:#666">Quoted Price</p><p style="margin:4px 0;font-size:28px;font-weight:bold;color:#059669">${escapeHtml(formattedPrice)}</p></div>${noteHtml}<p>Log in to accept or decline this quote. The quote will expire if not responded to.</p><p style="text-align:center"><a href="${bookingUrl}" class="button">Review Quote</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${buyerName},\n\nThe seller has sent you a quote for "${serviceTitle}".\n\nQuoted price: ${formattedPrice}${noteText}\nLog in to accept or decline: ${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Quote received for ${serviceTitle} — ${formattedPrice}`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendQuoteSentToBuyer failed:', error.message);
    return { sent: false, error: error.message };
  }
};

export const sendQuoteAcceptedToSeller = async (sellerAuthUserId, { serviceTitle, quotedPrice }) => {
  try {
    const { email, name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/seller/bookings`;
    const formattedPrice = `GH₵${Number(quotedPrice).toFixed(2)}`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#059669;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Quote Accepted!</h1></div><div class="content"><p>Hi ${escapeHtml(sellerName)},</p><p>Great news! The buyer has accepted your quote of <strong>${escapeHtml(formattedPrice)}</strong> for <strong>${escapeHtml(serviceTitle)}</strong>.</p><p>They will now proceed to payment. Once payment is confirmed, you can begin work.</p><p style="text-align:center"><a href="${bookingUrl}" class="button">View Booking</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${sellerName},\n\nThe buyer has accepted your quote of ${formattedPrice} for "${serviceTitle}".\n\nThey will now proceed to payment. View the booking: ${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Quote accepted — ${serviceTitle}`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendQuoteAcceptedToSeller failed:', error.message);
    return { sent: false, error: error.message };
  }
};

export const sendQuoteDeclinedToSeller = async (sellerAuthUserId, { serviceTitle }) => {
  try {
    const { email, name: sellerName } = await resolveSellerContact(sellerAuthUserId);
    if (!email) return { sent: false, reason: 'no_email' };
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const bookingUrl = `${frontendUrl}/seller/bookings`;
    const html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#dc2626;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:16px 0}.footer{text-align:center;padding:20px;color:#666;font-size:13px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0">Quote Declined</h1></div><div class="content"><p>Hi ${escapeHtml(sellerName)},</p><p>The buyer has declined your quote for <strong>${escapeHtml(serviceTitle)}</strong>. The booking has been closed.</p><p>No action is needed. You can view your other bookings in your dashboard.</p><p style="text-align:center"><a href="${bookingUrl}" class="button">View Bookings</a></p><p>Best regards,<br>The Hustle Village Team</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} Hustle Village</p></div></div></body></html>`;
    const text = `Hi ${sellerName},\n\nThe buyer has declined your quote for "${serviceTitle}". The booking has been closed.\n\nView your bookings: ${bookingUrl}\n\nBest regards,\nThe Hustle Village Team`;
    const info = await sendMail({ to: email, subject: `Quote declined — ${serviceTitle}`, html, text });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendQuoteDeclinedToSeller failed:', error.message);
    return { sent: false, error: error.message };
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
  // profiles.id IS the auth user ID — never use a separate user_id column for lookups
  const { data: profile } = await db
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', profileId)
    .maybeSingle();

  const name =
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'there';

  let email = profile?.email || null;

  if (!email && supabaseAdmin) {
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(profileId);
    if (!authErr && authData?.user?.email) {
      email = authData.user.email;
    } else if (authErr) {
      console.error('[email] resolveBuyerContact getUserById failed:', authErr.message, '| profileId:', profileId);
    }
  }

  if (!email) {
    console.warn('[email] resolveBuyerContact: no email found for profileId', profileId);
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

// ---------------------------------------------------------------------------
// New message notification → recipient
// ---------------------------------------------------------------------------

export const sendNewMessageNotification = async (
  recipientEmail,
  recipientName,
  senderName,
  conversationId,
  messageContent
) => {
  try {
    const frontendUrl = getFrontendUrl().replace(/\/+$/, '');
    const conversationUrl = `${frontendUrl}/messages/${conversationId}`;
    const safeSender = escapeHtml(senderName);
    const safeRecipient = escapeHtml(recipientName);
    const preview = messageContent
      ? escapeHtml(messageContent.slice(0, 120)) + (messageContent.length > 120 ? '…' : '')
      : null;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 28px 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 22px; }
          .content { background: #f9f9f9; padding: 28px 30px; border-radius: 0 0 10px 10px; }
          .preview-box { background: white; border-left: 4px solid #667eea; padding: 14px 16px; margin: 18px 0; border-radius: 0 4px 4px 0; font-style: italic; color: #555; }
          .button { display: inline-block; background: #667eea; color: white !important; padding: 13px 32px; text-decoration: none; border-radius: 6px; margin: 18px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
          .unsubscribe { color: #aaa; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You have a new message</h1>
          </div>
          <div class="content">
            <p>Hi ${safeRecipient},</p>
            <p><strong>${safeSender}</strong> sent you a message on Hustle Village.</p>
            ${preview ? `<div class="preview-box">"${preview}"</div>` : ''}
            <p style="text-align: center;">
              <a href="${conversationUrl}" class="button">View Message</a>
            </p>
            <p style="color: #666; font-size: 13px;">
              Reply quickly to keep the conversation moving — buyers and vendors close deals faster when they respond within an hour.
            </p>
            <p>Best,<br>The Hustle Village Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Hustle Village</p>
            <p class="unsubscribe">You can turn off these notifications in your <a href="${frontendUrl}/profile" style="color:#aaa;">account settings</a>.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${recipientName},

${senderName} sent you a message on Hustle Village.
${preview ? `\n"${preview}"\n` : ''}
View and reply here:
${conversationUrl}

Best,
The Hustle Village Team

---
To turn off these notifications, visit your account settings: ${frontendUrl}/profile
    `.trim();

    const info = await sendMail({
      to: recipientEmail,
      subject: `New message from ${senderName} — Hustle Village`,
      html,
      text,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[email] sendNewMessageNotification failed:', error.message);
    return { sent: false, error: error.message };
  }
};
