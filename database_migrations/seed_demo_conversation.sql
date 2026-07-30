-- Seeds a complete buyer↔vendor conversation for demo screenshots.
--
-- Derives both participants from an existing booking, so there are no UUIDs to
-- look up: the buyer is bookings.buyer_id and the vendor is the owner of the
-- booked service. Change v_booking_id below to seed a different pair.
--
-- Safe to re-run: reuses the existing conversation for that pair + service if
-- one is already there, and skips seeding entirely if it already has messages.
--
-- NOTE: if the messages INSERT webhook is enabled on this database, these
-- inserts will fire /api/messages/notify and email both participants. The
-- controller throttles to one email per recipient per conversation per hour
-- (NOTIFY_COOLDOWN_MINUTES = 60), so expect at most 2 emails, not one per
-- message. Disable the webhook first if even that is unwanted.

BEGIN;

DO $$
DECLARE
  v_booking_id uuid := 'bd282f89-5748-4255-ab6a-6fa41d94cb5c';

  v_buyer   uuid;
  v_seller  uuid;
  v_service uuid;
  v_conv    uuid;
  v_existing int;

  -- Conversation starts 3 days ago and ends a few minutes back, so the thread
  -- shows date separators and reads as recent activity.
  v_t0 timestamptz := now() - interval '3 days';
BEGIN
  SELECT b.buyer_id, s.user_id, b.service_id
    INTO v_buyer, v_seller, v_service
  FROM public.bookings b
  JOIN public.services s ON s.id = b.service_id
  WHERE b.id = v_booking_id;

  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'Booking % not found — set v_booking_id to a real booking', v_booking_id;
  END IF;

  IF v_buyer = v_seller THEN
    RAISE EXCEPTION 'Buyer and vendor are the same profile (%) — pick a booking between two different accounts', v_buyer;
  END IF;

  -- Reuse the existing thread for this pair + service if there is one
  SELECT id INTO v_conv
  FROM public.conversations
  WHERE service_id = v_service
    AND ( (participant1_id = v_buyer  AND participant2_id = v_seller)
       OR (participant1_id = v_seller AND participant2_id = v_buyer) )
  LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations
      (participant1_id, participant2_id, service_id, created_at, updated_at, last_message_at)
    VALUES
      (v_buyer, v_seller, v_service, v_t0, v_t0, v_t0)
    RETURNING id INTO v_conv;
  ELSE
    SELECT count(*) INTO v_existing FROM public.messages WHERE conversation_id = v_conv;
    IF v_existing > 0 THEN
      RAISE NOTICE 'Conversation % already has % message(s) — nothing seeded', v_conv, v_existing;
      RETURN;
    END IF;
  END IF;

  -- All marked read so the UI shows no unread badges in the screenshot
  INSERT INTO public.messages
    (conversation_id, sender_id, service_id, content, is_read, read_at, created_at)
  VALUES
    (v_conv, v_buyer,  v_service, 'Hi Edward, I saw your Professional Hair Styling listing. Do you do knotless braids?',
      true, v_t0 + interval '12 min', v_t0),

    (v_conv, v_seller, v_service, 'Hi! Yes — knotless braids, twists and cornrows. Waist length is GH₵200 and takes about 4 hours.',
      true, v_t0 + interval '20 min', v_t0 + interval '14 min'),

    (v_conv, v_buyer,  v_service, 'Perfect. I need it done before Saturday. Are you free Friday afternoon?',
      true, v_t0 + interval '25 min', v_t0 + interval '18 min'),

    (v_conv, v_seller, v_service, 'Friday from 1pm works. Do you have your own extensions or should I get them?',
      true, v_t0 + interval '40 min', v_t0 + interval '31 min'),

    (v_conv, v_buyer,  v_service, 'I''ll bring my own — I already have two packs of X-pression.',
      true, v_t0 + interval '50 min', v_t0 + interval '44 min'),

    (v_conv, v_seller, v_service, 'Two packs is plenty for waist length. Please come with your hair washed and blow-dried if you can.',
      true, v_t0 + interval '1 hour 5 min', v_t0 + interval '52 min'),

    (v_conv, v_buyer,  v_service, 'Noted. I''ve just booked it on the platform now.',
      true, v_t0 + interval '1 day 2 hours', v_t0 + interval '1 day 1 hour'),

    (v_conv, v_seller, v_service, 'Got the request and accepted it. You''ll see the MoMo details on the booking page.',
      true, v_t0 + interval '1 day 3 hours', v_t0 + interval '1 day 2 hours 10 min'),

    (v_conv, v_buyer,  v_service, 'Payment sent, and I''ve uploaded the receipt screenshot.',
      true, v_t0 + interval '1 day 4 hours', v_t0 + interval '1 day 3 hours 20 min'),

    (v_conv, v_seller, v_service, 'Received, thank you. See you Friday at 1pm — I''ll share my location the morning of.',
      true, v_t0 + interval '1 day 5 hours', v_t0 + interval '1 day 3 hours 35 min'),

    (v_conv, v_buyer,  v_service, 'Just got home — the braids came out beautiful! Thank you so much 😊',
      true, v_t0 + interval '2 days 8 hours', v_t0 + interval '2 days 7 hours'),

    (v_conv, v_seller, v_service, 'So glad you love them! I''ve marked the booking as delivered — please confirm on your end when you get a moment.',
      true, v_t0 + interval '2 days 9 hours', v_t0 + interval '2 days 7 hours 20 min'),

    (v_conv, v_buyer,  v_service, 'Just confirmed, and left you a 5-star review. Will be booking again before Christmas!',
      true, now() - interval '4 min', now() - interval '6 min');

  UPDATE public.conversations
     SET last_message_at = (SELECT max(created_at) FROM public.messages WHERE conversation_id = v_conv),
         updated_at      = now()
   WHERE id = v_conv;

  RAISE NOTICE 'Seeded 13 messages into conversation % (buyer %, vendor %)', v_conv, v_buyer, v_seller;
END $$;

COMMIT;

-- To undo (replace with the conversation id from the NOTICE above):
-- DELETE FROM public.messages WHERE conversation_id = '<conversation-id>';
