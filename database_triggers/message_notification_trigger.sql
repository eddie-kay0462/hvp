-- ============================================
-- EMAIL NOTIFICATION TRIGGER FOR MESSAGES
-- ============================================
-- This trigger automatically sends email notifications when a new message is inserted
-- It calls your backend API endpoint which handles the email sending

-- Step 1: Enable pg_net extension (for making HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Create function to call your backend API
CREATE OR REPLACE FUNCTION notify_message_received()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  recipient_email TEXT;
  sender_name TEXT;
  backend_url TEXT;
BEGIN
  -- Get backend URL from environment variable or use default
  -- You can set this in Supabase Dashboard > Settings > Database > Custom Config
  -- Or hardcode it here (change to your production URL when deploying)
  backend_url := COALESCE(
    current_setting('app.backend_url', true),
    'http://localhost:3000'  -- Change this to your production backend URL
  );

  -- Get recipient ID (the other participant in the conversation)
  SELECT 
    CASE 
      WHEN participant1_id = NEW.sender_id THEN participant2_id
      ELSE participant1_id
    END INTO recipient_id
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Get recipient email from auth.users
  SELECT email INTO recipient_email
  FROM auth.users
  WHERE id = recipient_id;

  -- Get sender name from profiles
  SELECT 
    COALESCE(
      NULLIF(TRIM(first_name || ' ' || COALESCE(last_name, '')), ''),
      first_name,
      last_name,
      'Someone'
    ) INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Only send notification if recipient email exists and it's not the sender messaging themselves
  IF recipient_email IS NOT NULL AND recipient_id != NEW.sender_id THEN
    -- Call your backend API endpoint asynchronously
    -- This won't block the message insertion
    PERFORM
      net.http_post(
        url := backend_url || '/api/messages/notify',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'recipientEmail', recipient_email,
          'senderName', sender_name,
          'messageContent', NEW.content,
          'conversationId', NEW.conversation_id::TEXT
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger that fires after a message is inserted
DROP TRIGGER IF EXISTS trigger_notify_message_received ON messages;

CREATE TRIGGER trigger_notify_message_received
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.sender_id IS NOT NULL AND NEW.content IS NOT NULL)
  EXECUTE FUNCTION notify_message_received();

-- Step 4: Add comment for documentation
COMMENT ON FUNCTION notify_message_received() IS 
  'Sends email notification to recipient when a new message is received. Calls backend API at /api/messages/notify';

-- ============================================
-- VERIFICATION
-- ============================================
-- To verify the trigger is set up correctly, run:
-- SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_message_received';

-- To test (after setting up your backend):
-- 1. Insert a test message into the messages table
-- 2. Check your backend logs for the API call
-- 3. Check the recipient's email inbox

