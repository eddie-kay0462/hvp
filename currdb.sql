-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  buyer_id uuid NOT NULL,
  service_id uuid NOT NULL,
  date date,
  time time without time zone,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'in_progress'::character varying, 'delivered'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  payment_status character varying DEFAULT NULL::character varying,
  payment_captured_at timestamp without time zone,
  payment_released_at timestamp without time zone,
  payment_amount numeric DEFAULT NULL::numeric,
  payment_transaction_id character varying DEFAULT NULL::character varying,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id),
  CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_name text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant1_id uuid NOT NULL,
  participant2_id uuid NOT NULL,
  service_id uuid,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_participant1_id_fkey FOREIGN KEY (participant1_id) REFERENCES public.profiles(id),
  CONSTRAINT conversations_participant2_id_fkey FOREIGN KEY (participant2_id) REFERENCES public.profiles(id),
  CONSTRAINT conversations_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid,
  buyer_id uuid,
  service_id uuid,
  amount numeric,
  currency text,
  invoice_number text,
  paystack_reference text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT invoices_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id),
  CONSTRAINT invoices_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.message_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text,
  file_size integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  attachments jsonb DEFAULT '[]'::jsonb,
  service_id uuid,
  link_url text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  phone text,
  role text DEFAULT 'customer'::text,
  profile_pic text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  description text NOT NULL,
  needed_by timestamp without time zone NOT NULL,
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'fulfilled'::character varying, 'accepted'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  accepted_by uuid,
  CONSTRAINT requests_pkey PRIMARY KEY (id),
  CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT requests_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  service_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id),
  CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id),
  CONSTRAINT reviews_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.sellers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  default_price numeric,
  default_delivery_time text,
  express_price numeric,
  express_delivery_time text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  portfolio text,
  is_verified boolean DEFAULT false,
  CONSTRAINT sellers_pkey PRIMARY KEY (id),
  CONSTRAINT sellers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  default_price numeric,
  default_delivery_time text,
  express_price numeric,
  express_delivery_time text,
  portfolio text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  image_urls ARRAY,
  rejection_reason text,
  verified_at timestamp with time zone,
  verified_by uuid,
  admin_notes text,
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT services_category_fkey FOREIGN KEY (category) REFERENCES public.categories(slug),
  CONSTRAINT services_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id)
);