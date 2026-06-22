-- ============================================================
-- Migration 009: Add OG and Ditto labor costs to Rate Cards
-- ============================================================

-- Add og_cost and ditto_cost columns to rate_card_services table
ALTER TABLE public.rate_card_services 
ADD COLUMN IF NOT EXISTS og_cost NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.rate_card_services 
ADD COLUMN IF NOT EXISTS ditto_cost NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Sync existing labor_cost to og_cost and ditto_cost so no data is lost
UPDATE public.rate_card_services 
SET og_cost = labor_cost, ditto_cost = labor_cost;
