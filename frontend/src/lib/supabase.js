import { createClient } from '@supabase/supabase-js';

// These are PUBLIC values (safe in the frontend). Row-Level Security on the
// Supabase side is what actually protects data — never the anon key secrecy.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If the keys aren't set yet, export null so the app can show a clear message
// instead of crashing on import.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = !!supabase;
