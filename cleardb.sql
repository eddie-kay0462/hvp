BEGIN;

  DELETE FROM public.payment_verification_events;
  DELETE FROM public.service_moderation_events;
  DELETE FROM public.disputes;
  DELETE FROM public.message_attachments;
  DELETE FROM public.messages;
  DELETE FROM public.invoices;
  DELETE FROM public.reviews; 
  DELETE FROM public.bookings;
  DELETE FROM public.conversations;
  DELETE FROM public.service_views;
  DELETE FROM public.services;
  DELETE FROM public.requests;
  DELETE FROM public.sellers;
  DELETE FROM public.profiles;

  COMMIT;