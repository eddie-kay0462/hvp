# Service Approval Workflow - Implementation Guide

## Overview

A complete service approval workflow has been implemented where sellers submit services for review, admins approve or reject them, and sellers receive email notifications about the status.

## 🎯 What Was Implemented

### 1. Database Changes
- **File**: `database_migrations/add_service_approval_workflow.sql`
- Added fields to `services` table:
  - `rejection_reason` - Why a service was rejected
  - `verified_at` - Timestamp when approved
  - `verified_by` - Admin who approved it
  - `admin_notes` - Internal notes for admins
- Set `is_verified` default to `false` (all new services need approval)
- Created database view `pending_services_view` for easier admin queries

### 2. Backend API

#### Admin Service Layer
- **File**: `src/services/adminService.js`
- Functions:
  - `getPendingServices()` - Get all services awaiting approval
  - `getAllServices(filters)` - Get all services with optional filters
  - `approveService(serviceId, adminId)` - Approve a service
  - `rejectService(serviceId, adminId, reason, notes)` - Reject a service
  - `getServiceStats()` - Get statistics (total, pending, approved, active)

#### Admin Controller
- **File**: `src/controllers/adminController.js`
- Endpoints with admin role checking:
  - `getPendingServices` - List pending services
  - `getAllServices` - List all services with filters
  - `approveService` - Approve and send email
  - `rejectService` - Reject and send email
  - `getServiceStats` - Dashboard statistics

#### Admin Routes
- **File**: `src/routes/adminRoutes.js`
- Added to server in `src/server.js`
- Routes (all require admin authentication):
  - `GET /api/admin/services/pending` - Get pending services
  - `GET /api/admin/services` - Get all services
  - `POST /api/admin/services/:serviceId/approve` - Approve service
  - `POST /api/admin/services/:serviceId/reject` - Reject service
  - `GET /api/admin/services/stats` - Get statistics

#### Email Notification Service
- **File**: `src/services/emailService.js`
- Functions:
  - `sendServiceApprovalEmail()` - Beautiful HTML email for approvals
  - `sendServiceRejectionEmail()` - Email with rejection feedback
  - `sendServiceSubmittedNotification()` - Notify admin of new submissions
- **✅ Integration**: Fully integrated with **Resend** email service
- **Note**: See `RESEND_EMAIL_SETUP.md` for detailed configuration instructions

#### Updated Service Creation
- **Files**: `src/services/sellerService.js`, `src/controllers/sellerController.js`
- Services now default to `is_verified: false`
- Success message indicates pending review
- Admin notification sent when service created

#### Enhanced Authentication
- **File**: `src/middleware/auth.js`
- Updated to fetch user role from `profiles` table
- `verifyAdminToken()` middleware checks for admin role
- `authenticate` alias for backwards compatibility

### 3. Frontend Implementation

#### Admin Dashboard
- **File**: `frontend/src/pages/admin/AdminPendingServices.tsx`
- Features:
  - Statistics cards (Total, Pending, Approved, Active)
  - List of pending services with full details
  - Approve button with instant feedback
  - Reject dialog with reason input
  - Admin notes field for internal use
  - Image preview for service images
  - Seller contact information display

#### API Integration
- **File**: `frontend/src/lib/api.ts`
- Added `admin` namespace with methods:
  - `getPendingServices()`
  - `getAllServices(filters)`
  - `approveService(serviceId)`
  - `rejectService(serviceId, reason, notes)`
  - `getServiceStats()`

#### Updated Seller UI
- **File**: `frontend/src/pages/seller/SellerServices.tsx`
- Changes:
  - Status column now shows verification status
  - "⏳ Pending Review" badge for unverified services
  - "✓ Verified" badge for approved services
  - Info alert at top when services are pending
  - Updated success message after service creation

#### Routing
- **File**: `frontend/src/App.tsx`
- Added route: `/admin/services/pending` → Admin dashboard

## 📋 Setup Instructions

### Step 1: Run Database Migration

```bash
# Connect to your Supabase database and run:
psql -h [your-db-host] -U [your-db-user] -d [your-db-name] -f database_migrations/add_service_approval_workflow.sql
```

Or run it directly in the Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `database_migrations/add_service_approval_workflow.sql`
3. Execute the SQL

### Step 2: Create Admin User

You need at least one admin user to access the approval dashboard:

```sql
-- Update a user's role to admin in the profiles table
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your-user-id-here';
```

### Step 3: Configure Resend Email Service (Required for Email Notifications)

The email service is **fully integrated with Resend** and ready to send emails:

1. **Get Your Resend API Key:**
   - Sign up at [resend.com](https://resend.com) (free plan available)
   - Go to API Keys and create a new key
   - Copy the API key (starts with `re_`)

2. **Set Environment Variables:**
   Add these to your `.env` file:
   ```env
   # Resend Configuration
   RESEND_API_KEY=re_your_actual_api_key_here
   FROM_EMAIL=noreply@hustlevillage.app
   ADMIN_EMAIL=admin@hustlevillage.app
   
   # Frontend URL (for email links)
   FRONTEND_URL=https://hustlevillage.app
   ```

   **For Development/Testing:**
   ```env
   RESEND_API_KEY=re_your_api_key
   FROM_EMAIL=onboarding@resend.dev
   ADMIN_EMAIL=your-email@example.com
   FRONTEND_URL=http://localhost:5173
   ```

3. **Verify Domain (Production Only):**
   - Add your domain in Resend dashboard
   - Add DNS records (SPF, DKIM) to your domain provider
   - Wait for verification
   
   For development, use `onboarding@resend.dev` (no verification needed)

4. **📖 Detailed Setup Guide:**
   See `RESEND_EMAIL_SETUP.md` for complete step-by-step instructions

### Step 4: Restart Backend Server

```bash
npm run dev
# or
node src/server.js
```

### Step 5: Test the Workflow

1. **As Seller:**
   - Sign up as a seller
   - Create a new service
   - Notice "Pending Review" status
   - See info alert about review process

2. **As Admin:**
   - Login with admin credentials
   - Navigate to `/admin/services/pending`
   - Review pending services
   - Approve or reject with feedback

3. **Verify:**
   - Check service status changes
   - Test email notifications (if configured)

## 🚀 Usage Guide

### For Sellers

1. **Create a Service:**
   - Go to "My Services"
   - Click "Add New Service"
   - Fill in all details
   - Submit

2. **Check Status:**
   - Services show "⏳ Pending Review" badge
   - Orange alert banner appears when pending
   - Email notification sent when approved/rejected

3. **After Rejection:**
   - Edit service based on feedback
   - Service stays in pending state until approved

### For Admins

1. **Access Dashboard:**
   - Navigate to `/admin/services/pending`
   - View all pending services and statistics

2. **Approve Services:**
   - Review service details, images, portfolio
   - Click "Approve" button
   - Seller receives approval email

3. **Reject Services:**
   - Click "Reject" button
   - Provide clear rejection reason (required)
   - Add internal notes (optional)
   - Seller receives rejection email with feedback

## 🎨 UI Features

### Admin Dashboard
- Clean, modern interface with cards
- Color-coded badges (Orange = Pending, Green = Approved)
- Statistics overview at the top
- Full service details in expandable cards
- Image gallery preview
- Seller contact information
- Quick action buttons

### Seller Services Page
- Status badges in service table
- Color-coded verification status
- Info alerts for pending services
- Updated messaging throughout

## 🔐 Security

- Admin routes protected with `authenticate` middleware
- Admin role check in controllers (double verification)
- RLS policies on Supabase tables (existing)
- Sellers cannot modify `is_verified` field

## 📧 Email Templates

Beautifully designed HTML email templates included for:

1. **Service Approved:**
   - Congratulatory message
   - Service details summary
   - Links to service page and dashboard
   - Next steps guidance

2. **Service Rejected:**
   - Constructive feedback
   - Clear rejection reason
   - Steps to improve
   - Link to edit service

3. **Admin Notification:**
   - New service submission alert
   - Seller information
   - Service summary
   - Link to admin dashboard

## 🛠️ API Endpoints Reference

### Admin Endpoints (Require Admin Auth)

```bash
# Get pending services
GET /api/admin/services/pending
Authorization: Bearer {token}

# Get all services with filters
GET /api/admin/services?is_verified=false&category=tutoring
Authorization: Bearer {token}

# Approve a service
POST /api/admin/services/{serviceId}/approve
Authorization: Bearer {token}

# Reject a service
POST /api/admin/services/{serviceId}/reject
Authorization: Bearer {token}
Content-Type: application/json
{
  "rejectionReason": "Service description needs more details",
  "adminNotes": "Follow up in 3 days"
}

# Get statistics
GET /api/admin/services/stats
Authorization: Bearer {token}
```

## 📊 Database Schema Updates

```sql
-- New columns in services table
ALTER TABLE services ADD COLUMN rejection_reason TEXT;
ALTER TABLE services ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE services ADD COLUMN verified_by UUID REFERENCES auth.users(id);
ALTER TABLE services ADD COLUMN admin_notes TEXT;
ALTER TABLE services ALTER COLUMN is_verified SET DEFAULT false;

-- New view for admin dashboard
CREATE VIEW pending_services_view AS
SELECT 
  s.*,
  p.first_name || ' ' || COALESCE(p.last_name, '') as seller_name,
  au.email as seller_email
FROM services s
LEFT JOIN profiles p ON s.user_id = p.id
LEFT JOIN auth.users au ON s.user_id = au.id
WHERE s.is_verified = false;
```

## 🐛 Troubleshooting

### Issue: Admin can't access dashboard
**Solution:** Check user role in profiles table:
```sql
SELECT id, role FROM profiles WHERE id = 'user-id';
UPDATE profiles SET role = 'admin' WHERE id = 'user-id';
```

### Issue: Services not showing as pending
**Solution:** Ensure migration was run:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'services' AND column_name = 'verified_at';
```

### Issue: Emails not sending
**Solution:** 
1. Check email service integration in `emailService.js`
2. Verify environment variables are set
3. Check server logs for email errors
4. Ensure email provider credentials are correct

## 🎯 Next Steps / Enhancements

1. **Email Integration:**
   - Complete integration with SendGrid/Mailgun
   - Test email templates
   - Add email preferences for sellers

2. **Enhanced Admin Dashboard:**
   - Add filters (category, date range)
   - Bulk approve/reject
   - Search functionality
   - Service history/audit log

3. **Notifications:**
   - In-app notification system
   - Push notifications
   - SMS notifications (optional)

4. **Analytics:**
   - Average approval time
   - Rejection reasons analytics
   - Admin performance metrics

5. **Automated Quality Checks:**
   - Image quality validation
   - Text content moderation
   - Price range validation

## ✅ Testing Checklist

- [ ] Database migration runs successfully
- [ ] Admin user can access `/admin/services/pending`
- [ ] Non-admin users are blocked from admin routes
- [ ] Sellers can create services
- [ ] Services show as "Pending Review" after creation
- [ ] Admin can approve services
- [ ] Admin can reject services with reasons
- [ ] Statistics update correctly
- [ ] Service status changes reflect in seller dashboard
- [ ] Email templates are formatted correctly
- [ ] Mobile responsive design works

## 📝 Notes

- The email service logs to console but doesn't send actual emails until you integrate with a provider
- All services created after migration will require approval (existing services remain as-is unless you update them)
- Admin access is based on the `role` field in the `profiles` table
- Services remain editable by sellers even when pending

## 🙌 Support

If you need help:
1. Check server logs for errors
2. Verify database migration was successful
3. Ensure environment variables are set
4. Test API endpoints directly with tools like Postman

---

**Implementation Status:** ✅ Complete and Ready for Testing

All backend and frontend components are implemented and integrated. The system is ready for database migration and testing.

