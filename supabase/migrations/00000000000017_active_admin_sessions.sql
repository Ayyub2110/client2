-- Migration: Create active_admin_sessions table to limit concurrent admin logins to max 6 members
CREATE TABLE IF NOT EXISTS public.active_admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for high-performance session lookup
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON public.active_admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.active_admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_shop ON public.active_admin_sessions(shop_id);
