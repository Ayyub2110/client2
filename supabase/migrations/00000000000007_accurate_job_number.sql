-- ============================================================
-- Migration 007: Accurate Job Number Generation
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_job_number(p_shop_id uuid)
RETURNS text AS $$
DECLARE
  v_today text;
  v_max_seq integer;
  v_job_number text;
BEGIN
  -- Lock the shop row to serialize sequence generation for this shop, avoiding simultaneous conflict locks
  PERFORM 1 FROM public.shops WHERE id = p_shop_id FOR UPDATE;

  -- Get current date format: YYYYMMDD in Asia/Kolkata timezone
  v_today := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD');
  
  -- Find the maximum sequence number for today for this shop (digits after the 12th character 'GK-YYYYMMDD-')
  SELECT coalesce(max(cast(substring(job_number from 13) as integer)), 0) INTO v_max_seq
  FROM public.repairs 
  WHERE shop_id = p_shop_id 
    AND substring(job_number from 4 for 8) = v_today;
    
  -- Generate sequence string: GK-YYYYMMDD-XXX
  v_job_number := 'GK-' || v_today || '-' || lpad((v_max_seq + 1)::text, 3, '0');
  
  RETURN v_job_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
