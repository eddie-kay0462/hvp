-- Removes the demo conversation seeded by seed_demo_conversation.sql.
--
-- Deletes only messages whose content matches the seeded set exactly, so any
-- real messages sent in that thread are left alone. Set v_booking_id to the
-- same value used when seeding.
--
-- The conversation row itself is dropped only if it ends up with no messages
-- left. That is safe: the app recreates a conversation on demand the next time
-- either party opens the thread (see useConversation.ts).

BEGIN;

DO $$
DECLARE
  v_booking_id uuid := 'bd282f89-5748-4255-ab6a-6fa41d94cb5c';

  v_buyer   uuid;
  v_seller  uuid;
  v_service uuid;
  v_conv    uuid;
  v_deleted int;
  v_left    int;

  v_seeded text[] := ARRAY[
    'Hi Edward, I saw your Professional Hair Styling listing. Do you do knotless braids?',
    'Hi! Yes — knotless braids, twists and cornrows. Waist length is GH₵200 and takes about 4 hours.',
    'Perfect. I need it done before Saturday. Are you free Friday afternoon?',
    'Friday from 1pm works. Do you have your own extensions or should I get them?',
    'I''ll bring my own — I already have two packs of X-pression.',
    'Two packs is plenty for waist length. Please come with your hair washed and blow-dried if you can.',
    'Noted. I''ve just booked it on the platform now.',
    'Got the request and accepted it. You''ll see the MoMo details on the booking page.',
    'Payment sent, and I''ve uploaded the receipt screenshot.',
    'Received, thank you. See you Friday at 1pm — I''ll share my location the morning of.',
    'Just got home — the braids came out beautiful! Thank you so much 😊',
    'So glad you love them! I''ve marked the booking as delivered — please confirm on your end when you get a moment.',
    'Just confirmed, and left you a 5-star review. Will be booking again before Christmas!'
  ];
BEGIN
  SELECT b.buyer_id, s.user_id, b.service_id
    INTO v_buyer, v_seller, v_service
  FROM public.bookings b
  JOIN public.services s ON s.id = b.service_id
  WHERE b.id = v_booking_id;

  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'Booking % not found', v_booking_id;
  END IF;

  SELECT id INTO v_conv
  FROM public.conversations
  WHERE service_id = v_service
    AND ( (participant1_id = v_buyer  AND participant2_id = v_seller)
       OR (participant1_id = v_seller AND participant2_id = v_buyer) )
  LIMIT 1;

  IF v_conv IS NULL THEN
    RAISE NOTICE 'No conversation found for that pair — nothing to clean up';
    RETURN;
  END IF;

  -- Attachments first: none are seeded, but a real message in this thread could
  -- have them, and this keeps the delete safe if the match set ever widens.
  DELETE FROM public.message_attachments
  WHERE message_id IN (
    SELECT id FROM public.messages
    WHERE conversation_id = v_conv AND content = ANY(v_seeded)
  );

  DELETE FROM public.messages
  WHERE conversation_id = v_conv AND content = ANY(v_seeded);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  SELECT count(*) INTO v_left FROM public.messages WHERE conversation_id = v_conv;

  IF v_left = 0 THEN
    -- Clear notification throttle rows so future messages notify normally
    DELETE FROM public.message_notifications WHERE conversation_id = v_conv;
    DELETE FROM public.conversations WHERE id = v_conv;
    RAISE NOTICE 'Deleted % seeded message(s) and removed the now-empty conversation %', v_deleted, v_conv;
  ELSE
    UPDATE public.conversations
       SET last_message_at = (SELECT max(created_at) FROM public.messages WHERE conversation_id = v_conv),
           updated_at      = now()
     WHERE id = v_conv;
    RAISE NOTICE 'Deleted % seeded message(s); % real message(s) remain, conversation % kept', v_deleted, v_left, v_conv;
  END IF;
END $$;

COMMIT;
