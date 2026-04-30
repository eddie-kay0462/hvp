import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Zoho Mail SMTP transport
// Credentials come from environment variables — never hardcode them.
// ---------------------------------------------------------------------------

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.ZOHO_SMTP_PORT || '465'),
  secure: true, // port 465 uses SSL; set false and port 587 for STARTTLS
  auth: {
    user: process.env.ZOHO_SMTP_USER, // e.g. noreply@hustlevillage.app
    pass: process.env.ZOHO_SMTP_PASS, // Zoho app password (not account password)
  },
});

const FROM_NAME = 'Hustle Village';
const FROM_EMAIL = process.env.ZOHO_SMTP_USER || 'noreply@hustlevillage.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hustlevillage.app';

const getFrontendUrl = () => process.env.FRONTEND_URL || 'https://hustlevillage.app';

// ---------------------------------------------------------------------------
// Shared send helper — single place to catch SMTP errors
// ---------------------------------------------------------------------------

async function sendMail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
  return info;
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
      to: ADMIN_EMAIL,
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
