-- FK indexes — PostgreSQL does NOT create indexes on foreign keys automatically.
-- Run this in the Supabase SQL editor.

CREATE INDEX IF NOT EXISTS idx_bookings_buyer_id       ON public.bookings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id     ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON public.bookings(status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id       ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON public.messages(created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_p1         ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2         ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_service_id ON public.conversations(service_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg   ON public.conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id     ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id     ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id      ON public.reviews(service_id);

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id         ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id           ON public.invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paystack_reference ON public.invoices(paystack_reference);

CREATE INDEX IF NOT EXISTS idx_requests_user_id       ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_accepted_by   ON public.requests(accepted_by);
CREATE INDEX IF NOT EXISTS idx_requests_status        ON public.requests(status);

CREATE INDEX IF NOT EXISTS idx_sellers_user_id        ON public.sellers(user_id);

CREATE INDEX IF NOT EXISTS idx_services_user_id       ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_category      ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_verified   ON public.services(is_verified);
CREATE INDEX IF NOT EXISTS idx_services_is_active     ON public.services(is_active);
