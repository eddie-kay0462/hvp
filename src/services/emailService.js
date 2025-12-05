import { supabaseAdmin } from '../config/supabase.js';
import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Default from email (must be verified in Resend dashboard)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@hustlevillage.app';

/**
 * Get frontend URL from environment or use default
 */
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'https://hustlevillage.app';
};

/**
 * Send service approval email notification
 * @param {string} sellerEmail - Seller's email address
 * @param {string} sellerName - Seller's name
 * @param {object} service - Service object
 */
export const sendServiceApprovalEmail = async (sellerEmail, sellerName, service) => {
  try {
    const frontendUrl = getFrontendUrl();
    const serviceUrl = `${frontendUrl}/services/${service.id}`;
    const dashboardUrl = `${frontendUrl}/seller/services`;

    // Use Supabase Auth to send email
    // Note: This requires configuring custom email templates in Supabase Dashboard
    // For now, we'll log and return success. You can integrate with SendGrid, Mailgun, etc.
    
    console.log('📧 Sending service approval email:');
    console.log(`   To: ${sellerEmail}`);
    console.log(`   Service: ${service.title}`);
    console.log(`   Service ID: ${service.id}`);

    // Send email using Resend
    const emailContent = {
      to: sellerEmail,
      subject: '🎉 Your service has been approved!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .service-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations!</h1>
            </div>
            <div class="content">
              <p>Hi ${sellerName || 'there'},</p>
              
              <p>Great news! Your service has been reviewed and <strong>approved</strong> by our team. It's now live on Hustle Village!</p>
              
              <div class="service-info">
                <h3>${service.title}</h3>
                <p>${service.description}</p>
                <p><strong>Category:</strong> ${service.category}</p>
                <p><strong>Price:</strong> GH₵ ${service.default_price || 'N/A'}</p>
              </div>
              
              <p>Your service is now visible to all buyers on our platform. Customers can start booking your service right away!</p>
              
              <p style="text-align: center;">
                <a href="${serviceUrl}" class="button">View Your Service</a>
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
              </p>
              
              <p><strong>What's next?</strong></p>
              <ul>
                <li>Monitor your bookings in the seller dashboard</li>
                <li>Respond quickly to customer inquiries</li>
                <li>Deliver quality service to earn great reviews</li>
              </ul>
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              
              <p>Best regards,<br>The Hustle Village Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Hustle Village. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${sellerName || 'there'},

Great news! Your service "${service.title}" has been approved and is now live on Hustle Village!

Service Details:
- Title: ${service.title}
- Category: ${service.category}
- Price: GH₵ ${service.default_price || 'N/A'}

View your service: ${serviceUrl}
Go to dashboard: ${dashboardUrl}

What's next?
- Monitor your bookings in the seller dashboard
- Respond quickly to customer inquiries
- Deliver quality service to earn great reviews

Best regards,
The Hustle Village Team
      `
    };

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: emailContent.to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw error;
    }

    console.log('✅ Service approval email sent successfully via Resend');
    console.log(`   To: ${sellerEmail}`);
    console.log(`   Service: ${service.title}`);
    console.log(`   Message ID: ${data?.id}`);
    
    return { success: true, message: 'Email sent successfully', data };
  } catch (error) {
    console.error('❌ Failed to send approval email:', error);
    throw error;
  }
};

/**
 * Send service rejection email notification
 * @param {string} sellerEmail - Seller's email address
 * @param {string} sellerName - Seller's name
 * @param {object} service - Service object
 * @param {string} rejectionReason - Reason for rejection
 */
export const sendServiceRejectionEmail = async (sellerEmail, sellerName, service, rejectionReason) => {
  try {
    const frontendUrl = getFrontendUrl();
    const editServiceUrl = `${frontendUrl}/seller/services`;
    const supportUrl = `${frontendUrl}/support`;

    console.log('📧 Sending service rejection email:');
    console.log(`   To: ${sellerEmail}`);
    console.log(`   Service: ${service.title}`);
    console.log(`   Reason: ${rejectionReason}`);

    const emailContent = {
      to: sellerEmail,
      subject: 'Your service needs some updates',
      html: `
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
            <div class="header">
              <h1>Service Review Update</h1>
            </div>
            <div class="content">
              <p>Hi ${sellerName || 'there'},</p>
              
              <p>Thank you for submitting your service to Hustle Village. After reviewing your service, we need you to make some updates before we can approve it.</p>
              
              <div class="service-info">
                <h3>${service.title}</h3>
                <p><strong>Category:</strong> ${service.category}</p>
              </div>
              
              <div class="reason-box">
                <h4>📋 Feedback from our team:</h4>
                <p>${rejectionReason}</p>
              </div>
              
              <p><strong>What should you do?</strong></p>
              <ol>
                <li>Review the feedback carefully</li>
                <li>Update your service with the necessary changes</li>
                <li>Resubmit your service for approval</li>
              </ol>
              
              <p style="text-align: center;">
                <a href="${editServiceUrl}" class="button">Edit Your Service</a>
              </p>
              
              <p>If you have any questions or need clarification on the feedback, please don't hesitate to contact our support team.</p>
              
              <p>We're here to help you succeed on Hustle Village!</p>
              
              <p>Best regards,<br>The Hustle Village Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Hustle Village. All rights reserved.</p>
              <p><a href="${supportUrl}" style="color: #667eea;">Contact Support</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${sellerName || 'there'},

Thank you for submitting your service to Hustle Village. After reviewing your service "${service.title}", we need you to make some updates before we can approve it.

Feedback from our team:
${rejectionReason}

What should you do?
1. Review the feedback carefully
2. Update your service with the necessary changes
3. Resubmit your service for approval

Edit your service: ${editServiceUrl}

If you have any questions, please contact our support team.

Best regards,
The Hustle Village Team
      `
    };

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: emailContent.to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw error;
    }

    console.log('✅ Service rejection email sent successfully via Resend');
    console.log(`   To: ${sellerEmail}`);
    console.log(`   Service: ${service.title}`);
    console.log(`   Message ID: ${data?.id}`);
    
    return { success: true, message: 'Email sent successfully', data };
  } catch (error) {
    console.error('❌ Failed to send rejection email:', error);
    throw error;
  }
};

/**
 * Send service submitted notification (to admin)
 * @param {object} service - Service object
 * @param {string} sellerEmail - Seller's email
 * @param {string} sellerName - Seller's name
 */
export const sendServiceSubmittedNotification = async (service, sellerEmail, sellerName) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hustlevillage.app';
    const frontendUrl = getFrontendUrl();
    const adminDashboardUrl = `${frontendUrl}/admin/services/pending`;

    console.log('📧 Sending service submission notification to admin:');
    console.log(`   Service: ${service.title}`);
    console.log(`   Seller: ${sellerName} (${sellerEmail})`);

    const emailContent = {
      to: adminEmail,
      subject: '🔔 New Service Pending Approval',
      html: `
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
            <div class="header">
              <h1>🔔 New Service Submission</h1>
            </div>
            <div class="content">
              <p>Hi Admin,</p>
              
              <p>A new service has been submitted and is awaiting your approval.</p>
              
              <div class="service-info">
                <h3>${service.title}</h3>
                <p>${service.description}</p>
                <p><strong>Category:</strong> ${service.category}</p>
                <p><strong>Price:</strong> GH₵ ${service.default_price || 'N/A'}</p>
                <p><strong>Seller:</strong> ${sellerName}</p>
                <p><strong>Email:</strong> ${sellerEmail}</p>
              </div>
              
              <p style="text-align: center;">
                <a href="${adminDashboardUrl}" class="button">Review Service</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Hustle Village. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
New Service Submission

A new service has been submitted and is awaiting approval.

Service: ${service.title}
Category: ${service.category}
Price: GH₵ ${service.default_price || 'N/A'}
Seller: ${sellerName} (${sellerEmail})

Review service: ${adminDashboardUrl}
      `
    };

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: emailContent.to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw error;
    }

    console.log('✅ Admin notification email sent successfully via Resend');
    console.log(`   Service: ${service.title}`);
    console.log(`   Seller: ${sellerName} (${sellerEmail})`);
    console.log(`   Message ID: ${data?.id}`);
    
    return { success: true, message: 'Email sent successfully', data };
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    throw error;
  }
};

