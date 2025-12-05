-- ============================================
-- SERVICE APPROVAL WORKFLOW MIGRATION
-- ============================================
-- This migration adds fields to support service approval workflow
-- where services need admin approval before going live

-- Step 1: Add new columns to services table (if they don't exist)
-- These allow tracking of approval/rejection with reasons and timestamps

-- Add rejection_reason column (stores why a service was rejected)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add verified_at timestamp (when service was approved)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add verified_by column (which admin approved it)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Add admin_notes column (for internal notes about the service)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Step 2: Set default value for is_verified to false
-- This ensures new services require approval
ALTER TABLE services 
ALTER COLUMN is_verified SET DEFAULT false;

-- Step 3: Update existing services that have null is_verified
-- Set them to false so they go through approval process
-- (You can change this to true if you want to grandfather existing services)
UPDATE services 
SET is_verified = false 
WHERE is_verified IS NULL;

-- Step 4: Add index for faster queries on pending services
CREATE INDEX IF NOT EXISTS idx_services_verification_status 
ON services(is_verified, created_at) 
WHERE is_verified = false;

-- Step 5: Add admin role check (ensure profiles table has role field)
-- This is likely already in place, but just to be safe

-- Step 6: Create view for pending services (for admin dashboard)
CREATE OR REPLACE VIEW pending_services_view AS
SELECT 
  s.id,
  s.user_id,
  s.title,
  s.description,
  s.category,
  s.default_price,
  s.portfolio,
  s.created_at,
  s.image_urls,
  s.rejection_reason,
  s.admin_notes,
  p.first_name || ' ' || COALESCE(p.last_name, '') as seller_name,
  p.phone as seller_phone,
  au.email as seller_email
FROM services s
LEFT JOIN profiles p ON s.user_id = p.id
LEFT JOIN auth.users au ON s.user_id = au.id
WHERE s.is_verified = false
ORDER BY s.created_at DESC;

-- Step 7: Add comment for documentation
COMMENT ON COLUMN services.rejection_reason IS 'Reason why the service was rejected by admin';
COMMENT ON COLUMN services.verified_at IS 'Timestamp when the service was approved';
COMMENT ON COLUMN services.verified_by IS 'Admin user ID who approved the service';
COMMENT ON COLUMN services.admin_notes IS 'Internal notes about the service for admins';

-- ============================================
-- VERIFICATION
-- ============================================
-- To verify the migration:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'services' 
-- AND column_name IN ('rejection_reason', 'verified_at', 'verified_by', 'admin_notes', 'is_verified');

