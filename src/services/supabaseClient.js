import { createClient } from '@supabase/supabase-js';

// Safe fallback constants for testing environments (Vitest/jsdom) without .env.local
const DEFAULT_SUPABASE_URL = 'https://mdxnjlhjqskqsndeiepy.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keG5qbGhqcXNrcXNuZGVpZXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODEzMTAsImV4cCI6MjA5NDk1NzMxMH0.MKu52vp4uoqF48WVTpbD2NxLlOYOGxjG4-m4Pij_L8s';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'mei_studio_supabase_auth_token_v1'
  }
});
