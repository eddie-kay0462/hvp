# Service Approval Workflow - Quick Start Checklist ✅

Follow this checklist to get your service approval workflow up and running in minutes!

## 🎯 Prerequisites
- [ ] Backend server running
- [ ] Frontend application running
- [ ] Access to Supabase dashboard
- [ ] Resend account (sign up at [resend.com](https://resend.com))

---

## 📋 Setup Steps

### 1. Database Setup (5 minutes)

- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy contents of `database_migrations/add_service_approval_workflow.sql`
- [ ] Paste and execute the SQL
- [ ] Verify columns were added:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'services' 
  AND column_name IN ('rejection_reason', 'verified_at', 'verified_by', 'admin_notes');
  ```

### 2. Create Admin User (2 minutes)

- [ ] Find your user ID (from profiles table or auth dashboard)
- [ ] Run this SQL to make yourself an admin:
  ```sql
  UPDATE profiles 
  SET role = 'admin' 
  WHERE id = 'your-user-id-here';
  ```
- [ ] Verify:
  ```sql
  SELECT id, first_name, last_name, role FROM profiles WHERE role = 'admin';
  ```

### 3. Resend Email Setup (10 minutes)

- [ ] Sign up at [resend.com](https://resend.com)
- [ ] Go to **API Keys** → Create API Key
- [ ] Copy the API key (starts with `re_`)
- [ ] Add to your `.env` file:
  ```bash
  RESEND_API_KEY=re_your_api_key_here
  FROM_EMAIL=onboarding@resend.dev
  ADMIN_EMAIL=your-email@example.com
  FRONTEND_URL=http://localhost:5173
  ```
- [ ] Save the `.env` file

**Note:** For development, use `onboarding@resend.dev` as FROM_EMAIL (no domain verification needed). For production, see `RESEND_EMAIL_SETUP.md`.

### 4. Restart Backend Server (1 minute)

- [ ] Stop your backend server (Ctrl+C)
- [ ] Restart it:
  ```bash
  npm run dev
  ```
- [ ] Check console for startup message
- [ ] Verify no errors about RESEND_API_KEY

---

## 🧪 Testing (10 minutes)

### Test 1: Create a Service as Seller

- [ ] Log in as a seller (not the admin account)
- [ ] Navigate to "My Services"
- [ ] Click "Add New Service"
- [ ] Fill in all required fields
- [ ] Submit the service
- [ ] Verify you see "⏳ Pending Review" badge
- [ ] Check server console for email logs:
  ```
  📧 Sending service submission notification to admin
  ✅ Admin notification email sent successfully via Resend
  ```
- [ ] Check your email (ADMIN_EMAIL) for notification

### Test 2: Approve Service as Admin

- [ ] Log out and log in as admin
- [ ] Navigate to `/admin/services/pending`
- [ ] Verify you see the dashboard with statistics
- [ ] Find the pending service
- [ ] Review the service details
- [ ] Click "Approve" button
- [ ] Check for success message
- [ ] Check server console for email logs:
  ```
  ✅ Service approval email sent successfully via Resend
  ```
- [ ] Check seller's email for approval notification

### Test 3: Reject Service as Admin

- [ ] Create another test service as seller
- [ ] As admin, go to pending services
- [ ] Click "Reject" on the service
- [ ] Enter rejection reason: "Test rejection - please add more details"
- [ ] (Optional) Add admin notes
- [ ] Click "Reject Service"
- [ ] Check for success message
- [ ] Check seller's email for rejection notification

### Test 4: Verify Seller Dashboard

- [ ] Log in as seller
- [ ] Go to "My Services"
- [ ] Verify approved service shows "✓ Verified" badge
- [ ] Verify rejected service shows "⏳ Pending Review" badge
- [ ] Check that info alert appears at the top

---

## ✅ Verification Checklist

### Backend
- [ ] Admin routes accessible at `/api/admin/*`
- [ ] Email service initialized without errors
- [ ] Admin middleware checking user roles
- [ ] Service creation sets `is_verified = false`

### Frontend
- [ ] Admin dashboard accessible at `/admin/services/pending`
- [ ] Seller services show correct verification badges
- [ ] Info alerts appear for pending services
- [ ] Statistics cards showing correct numbers

### Emails
- [ ] Admin receives notification when service is submitted
- [ ] Seller receives approval email
- [ ] Seller receives rejection email with feedback
- [ ] All emails formatted correctly (HTML)
- [ ] All links in emails work correctly

---

## 🐛 Troubleshooting

### Issue: Can't access admin dashboard
**Solution:**
```sql
-- Check your role
SELECT role FROM profiles WHERE id = 'your-user-id';

-- If not admin, update it
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id';
```

### Issue: Emails not sending
**Check:**
1. `RESEND_API_KEY` is set in `.env`
2. Backend server was restarted after adding env vars
3. Server console for error messages
4. Resend dashboard → Emails for delivery status

**Quick fix:**
```bash
# Verify env var is loaded
node -e "require('dotenv').config(); console.log('API Key:', process.env.RESEND_API_KEY ? 'Set ✅' : 'Missing ❌')"
```

### Issue: Admin dashboard shows 403 Forbidden
**Solution:** Your user doesn't have admin role. Run the SQL from step 2 above.

### Issue: Services still showing as "Active" instead of "Pending"
**Solution:** Database migration wasn't run. Go back to step 1.

---

## 📚 Documentation Reference

- **Complete Guide**: `SERVICE_APPROVAL_IMPLEMENTATION_GUIDE.md`
- **Email Setup**: `RESEND_EMAIL_SETUP.md`
- **Database Schema**: `database_migrations/add_service_approval_workflow.sql`

---

## 🎉 Success Criteria

You've successfully set up the service approval workflow when:

✅ Sellers can create services that go into pending status  
✅ Admin receives email notification of new services  
✅ Admin can view pending services in dashboard  
✅ Admin can approve services with one click  
✅ Admin can reject services with feedback  
✅ Sellers receive email notifications about approval/rejection  
✅ Approved services show "✓ Verified" badge  
✅ Pending services show "⏳ Pending Review" badge  
✅ Email templates look professional and contain correct information  

---

## 🚀 Next Steps

Once everything is working:

1. **Production Setup:**
   - Add and verify your domain in Resend
   - Update `FROM_EMAIL` to your domain email
   - Set production `FRONTEND_URL`
   - Update `ADMIN_EMAIL` to team email

2. **Customize Email Templates:**
   - Edit `src/services/emailService.js`
   - Update branding, colors, messaging
   - Add your logo

3. **Optional Enhancements:**
   - Add bulk approve/reject
   - Add search and filters to admin dashboard
   - Add email preferences for sellers
   - Set up webhooks for email events

---

**Estimated Total Time:** 30 minutes

**Ready to go?** Start with Step 1! 🚀

