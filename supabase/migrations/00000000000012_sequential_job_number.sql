-- ============================================================
-- Migration 012: Sequential Job Number Generation Across Days
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_job_number(p_shop_id uuid)
RETURNS text AS $$
DECLARE
  v_today text;
  v_max_seq integer;
  v_job_number text;
BEGIN
  -- Lock the shop row to serialize sequence generation for this shop, avoiding simultaneous conflictwhen locks
  PERFORM 1 FROM public.shops WHERE id = p_shop_id FOR UPDATE;

  -- Get current date format: YYYYMMDD in Asia/Kolkata timezone
  v_today := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD');
  
  -- Find the maximum sequence number across all job numbers matching the GK-YYYYMMDD-XXX pattern for this shop
  SELECT coalesce(max(cast(substring(job_number from 13) as integer)), 0) INTO v_max_seq
  FROM public.repairs 
  WHERE shop_id = p_shop_id 
    AND job_number ~ '^GK-[0-9]{8}-[0-9]+$';
    
  -- Generate sequence string: GK-YYYYMMDD-XXX
  v_job_number := 'GK-' || v_today || '-' || lpad((v_max_seq + 1)::text, 3, '0');
  
  RETURN v_job_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
