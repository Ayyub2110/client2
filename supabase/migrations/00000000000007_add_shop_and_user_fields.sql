-- Migration: Add new fields for shop types, GST, community username and currency options.
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS shop_type text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS currency_symbol text DEFAULT '₹';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS currency_code text DEFAULT 'INR';

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS community_username text;
