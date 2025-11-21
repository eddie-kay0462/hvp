-- ============================================
-- REMOVE EMAIL NOTIFICATION TRIGGER
-- ============================================
-- Run this in Supabase SQL Editor to remove the email notification trigger

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_notify_message_received ON messages;

-- Drop the function
DROP FUNCTION IF EXISTS notify_message_received();

-- Verify removal
SELECT 
  'Trigger removed' as status,
  COUNT(*) as remaining_triggers
FROM pg_trigger 
WHERE tgname = 'trigger_notify_message_received';

SELECT 
  'Function removed' as status,
  COUNT(*) as remaining_functions
FROM pg_proc 
WHERE proname = 'notify_message_received';

