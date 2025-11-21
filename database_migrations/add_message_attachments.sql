-- ============================================
-- MESSAGE ATTACHMENTS & EXTERNAL LINKS MIGRATION
-- ============================================
-- Run this in your Supabase SQL Editor

-- Step 1: Add attachments column to messages table (JSONB array of image URLs)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Step 2: Add link_url column to messages table for external links (websites, Canva, etc.)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Step 3: Add index on link_url for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_link_url ON messages(link_url);

-- Step 4: Add index on attachments for better query performance (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN messages.attachments IS 'Array of image URLs stored in Supabase Storage message-attachments bucket';
COMMENT ON COLUMN messages.link_url IS 'Optional external URL link (e.g., website, Canva link, portfolio, etc.)';

-- Step 6: Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('attachments', 'link_url');

