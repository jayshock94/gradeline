// Supabase client. Without the two env vars the app runs in demo mode only (no sign-in, data stays in the browser).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const cloudEnabled = !!supabase;

export function initialsOf(name, email) {
  const src = (name || '').trim() || (email || '').split('@')[0] || '?';
  const parts = src.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2)).toUpperCase();
}

export function displayName(user) {
  if (!user) return '';
  const m = user.user_metadata || {};
  return m.full_name || m.name || (user.email || '').split('@')[0] || 'You';
}
