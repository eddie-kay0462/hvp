# Resend Email Integration Setup Guide

## Overview

The service approval workflow uses **Resend** as the email service provider to send beautiful, professional emails to sellers when their services are approved or rejected.

## Prerequisites

1. A Resend account (sign up at [resend.com](https://resend.com))
2. A verified domain in Resend (or use their test domain for development)

## Step-by-Step Setup

### Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. Log in to your Resend dashboard
2. Go to **API Keys** in the sidebar
3. Click **Create API Key**
4. Name it (e.g., "Hustle Village Production")
5. Choose permissions: **Full Access** (for sending emails)
6. Copy the API key (starts with `re_`)
7. **Important**: Save it securely - you won't be able to see it again!

### Step 3: Add Domain (Production) or Use Test Domain (Development)

#### For Development/Testing:
- Resend provides a test domain: `onboarding@resend.dev`
- You can send up to 100 emails per day
- Emails will only be delivered to the email associated with your Resend account
- No setup required - works immediately!

#### For Production:
1. Go to **Domains** in your Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `hustlevillage.app`)
4. Add the provided DNS records to your domain provider:
   - SPF record
   - DKIM records
   - DMARC record (optional but recommended)
5. Wait for DNS propagation (usually 5-30 minutes)
6. Click **Verify** in Resend dashboard
7. Once verified, you can send from `noreply@hustlevillage.app` or any address

### Step 4: Configure Environment Variables

Add these to your `.env` file (create one if it doesn't exist):

```bash
# Resend Email Configuration
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=noreply@hustlevillage.app
ADMIN_EMAIL=admin@hustlevillage.app

# Frontend URL (for email links)
FRONTEND_URL=https://hustlevillage.app
```

#### Development Example:
```bash
RESEND_API_KEY=re_abc123xyz789
FROM_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=youremail@example.com
FRONTEND_URL=http://localhost:5173
```

#### Production Example:
```bash
RESEND_API_KEY=re_live_abc123xyz789
FROM_EMAIL=noreply@hustlevillage.app
ADMIN_EMAIL=admin@hustlevillage.app
FRONTEND_URL=https://hustlevillage.app
```

### Step 5: Test Email Sending

1. Restart your backend server:
   ```bash
   npm run dev
   ```

2. Create a test service as a seller

3. Check your terminal/console for logs:
   ```
   📧 Sending service submission notification to admin:
      Service: Test Service
      Seller: John Doe (john@example.com)
   ✅ Admin notification email sent successfully via Resend
      Message ID: abc123-def456-ghi789
   ```

4. Check your email inbox (admin email) for the notification

5. Approve or reject the service from admin dashboard

6. Check seller's email inbox for approval/rejection email

## Email Templates

The system sends three types of emails:

### 1. Service Approval Email
- **Sent to**: Seller
- **When**: Admin approves their service
- **Subject**: "🎉 Your service has been approved!"
- **Contains**: 
  - Congratulations message
  - Service details
  - Links to view service and dashboard
  - Next steps guidance

### 2. Service Rejection Email
- **Sent to**: Seller
- **When**: Admin rejects their service
- **Subject**: "Your service needs some updates"
- **Contains**:
  - Constructive feedback
  - Rejection reason from admin
  - Steps to improve
  - Link to edit service

### 3. Admin Notification Email
- **Sent to**: Admin (configured in ADMIN_EMAIL)
- **When**: Seller submits a new service
- **Subject**: "🔔 New Service Pending Approval"
- **Contains**:
  - Service details
  - Seller information
  - Link to admin dashboard

## Troubleshooting

### Issue: Emails not being sent

**Check 1: API Key**
```bash
# Verify your API key is set correctly
echo $RESEND_API_KEY
# Should output: re_something...
```

**Check 2: FROM_EMAIL domain**
- In development: Use `onboarding@resend.dev`
- In production: Ensure domain is verified in Resend dashboard

**Check 3: Server logs**
```bash
# Look for error messages in your server console
npm run dev
```

Common errors:
- `401 Unauthorized` → Wrong API key
- `403 Forbidden` → Domain not verified
- `404 Not Found` → Wrong API endpoint
- `422 Unprocessable Entity` → Invalid email format

### Issue: Emails going to spam

**Solution:**
1. Verify your domain in Resend
2. Add all DNS records (SPF, DKIM, DMARC)
3. Warm up your domain by sending gradually increasing volumes
4. Use a professional sender name and email
5. Include an unsubscribe link (for marketing emails)

### Issue: Rate limiting

**Free Plan Limits:**
- 100 emails/day
- 3,000 emails/month

**Solution:**
- Upgrade to Resend Pro plan ($20/month for 50,000 emails)
- Or use multiple API keys (not recommended)

## Testing in Development

### Using Resend Test Domain

With the test domain, you can only send to your own email:

```bash
# .env
FROM_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=your-actual-email@gmail.com
```

When testing:
1. All seller emails will only work if sent to your Resend account email
2. Admin notifications will work normally
3. Perfect for development without spamming real users

### Testing with Real Domain

If you have a verified domain:
1. Add multiple test email addresses as recipients
2. Use email testing services like:
   - [Mailtrap.io](https://mailtrap.io) (email sandbox)
   - [Mailhog](https://github.com/mailhog/MailHog) (local email testing)

## Monitoring Email Delivery

### Resend Dashboard

1. Go to **Emails** in your Resend dashboard
2. View all sent emails with:
   - Delivery status
   - Open rates (if tracking enabled)
   - Click rates
   - Bounce/complaint information

### Server Logs

The email service logs detailed information:

```bash
✅ Service approval email sent successfully via Resend
   To: seller@example.com
   Service: Professional Web Design
   Message ID: abc123-def456
```

## Cost Breakdown

### Free Plan
- ✅ 3,000 emails/month
- ✅ 100 emails/day
- ✅ 1 domain
- ✅ Email API
- ❌ No dedicated IPs

**Perfect for:**
- Development
- Small marketplaces (<100 services/month)
- Testing

### Pro Plan ($20/month)
- ✅ 50,000 emails/month
- ✅ Additional emails: $1/1,000
- ✅ Multiple domains
- ✅ Custom SMTP
- ✅ Priority support

**Perfect for:**
- Production applications
- Growing marketplaces
- Professional use

## Email Best Practices

1. **Subject Lines:**
   - Keep under 50 characters
   - Use emojis sparingly (1-2 max)
   - Be clear and actionable

2. **Content:**
   - Use HTML for rich formatting
   - Always include plain text version
   - Keep emails concise
   - Include clear call-to-action buttons

3. **Links:**
   - Use absolute URLs (with https://)
   - Test all links before sending
   - Use UTM parameters for tracking (optional)

4. **Sender Info:**
   - Use a recognizable sender name
   - Use a professional sender email
   - Consider using reply-to address

## Advanced Features

### Email Analytics

Enable open and click tracking:

```javascript
const { data, error } = await resend.emails.send({
  from: FROM_EMAIL,
  to: sellerEmail,
  subject: 'Your service is approved!',
  html: htmlContent,
  tags: [
    { name: 'category', value: 'service_approval' },
    { name: 'user_id', value: userId }
  ],
  // Enable tracking
  headers: {
    'X-Entity-Ref-ID': serviceId,
  }
});
```

### Batch Sending

Send multiple emails at once:

```javascript
const { data, error } = await resend.batch.send([
  {
    from: FROM_EMAIL,
    to: 'seller1@example.com',
    subject: 'Service Approved',
    html: htmlContent1,
  },
  {
    from: FROM_EMAIL,
    to: 'seller2@example.com',
    subject: 'Service Approved',
    html: htmlContent2,
  }
]);
```

## Support

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Resend Support**: support@resend.com
- **Community**: [Resend Discord](https://resend.com/discord)

## Security Notes

- ⚠️ Never commit your API key to version control
- ⚠️ Use environment variables for all sensitive data
- ⚠️ Rotate API keys periodically
- ⚠️ Use different API keys for dev/staging/production
- ⚠️ Monitor your Resend dashboard for suspicious activity

---

**Status**: ✅ Email integration is complete and ready to use!

The email service will automatically send emails when:
1. A seller submits a new service → Admin notification
2. An admin approves a service → Seller approval email
3. An admin rejects a service → Seller rejection email with feedback

