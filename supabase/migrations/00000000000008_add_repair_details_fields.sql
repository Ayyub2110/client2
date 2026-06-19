-- Migration: Add additional fields for repair orders and devices

ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS lock_code text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS pattern_lock text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS accessory_adapter boolean DEFAULT false;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS accessory_keyboard_mouse boolean DEFAULT false;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS accessory_other boolean DEFAULT false;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS serial_number text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS warranty text;

ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS send_whatsapp boolean DEFAULT false;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS send_email boolean DEFAULT false;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS allow_cashback boolean DEFAULT false;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS expense numeric(10,2) DEFAULT 0.00;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS kyc_details text;
