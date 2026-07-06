import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error(
    `Missing Supabase environment variables on server. Checked: ` +
    `SUPABASE_URL (${supabaseUrl ? 'FOUND' : 'MISSING'}), ` +
    `SUPABASE_ANON_KEY (${supabaseAnonKey ? 'FOUND' : 'MISSING'}), ` +
    `SUPABASE_SERVICE_ROLE_KEY (${supabaseServiceKey ? 'FOUND' : 'MISSING'}). ` +
    `Please set these in your Vercel Project Settings.`
  );
}

// Client for normal transactions or user identity checks
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with full bypass of RLS, used only in server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
