import { createClient } from '@supabase/supabase-js';

// Dedicated independent Supabase database for Mei Creative Studio (xtyuyuralrnwzsjvyslp in ap-northeast-1)
export const DEFAULT_SUPABASE_URL = 'https://xtyuyuralrnwzsjvyslp.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0eXV5dXJhbHJud3pzanZ5c2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MTUxOTgsImV4cCI6MjExMDI5MTE5OH0.a_jvAqs6xH8wUf6-x9pn6uAtbfH6qTjdF3QK3vDQ6FY';

export function isValidHttpUrl(urlString) {
  if (typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getEffectiveSupabaseConfig() {
  let customUrl = null;
  let customKey = null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUrl = window.localStorage.getItem('mei_custom_supabase_url');
      if (typeof storedUrl === 'string') {
        const trimmedUrl = storedUrl.trim();
        if (isValidHttpUrl(trimmedUrl)) {
          customUrl = trimmedUrl;
        }
      }

      const storedKey = window.localStorage.getItem('mei_custom_supabase_anon_key');
      if (typeof storedKey === 'string') {
        const trimmedKey = storedKey.trim();
        if (trimmedKey.length > 0) {
          customKey = trimmedKey;
        }
      }
    }
  } catch {
    // Ignore localStorage access restrictions or exceptions
  }

  const rawEnvUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL;
  const envUrl =
    typeof rawEnvUrl === 'string' && isValidHttpUrl(rawEnvUrl.trim())
      ? rawEnvUrl.trim()
      : null;

  const supabaseUrl = customUrl || envUrl || DEFAULT_SUPABASE_URL;

  const rawEnvKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY;
  const envKey =
    typeof rawEnvKey === 'string' && rawEnvKey.trim().length > 0
      ? rawEnvKey.trim()
      : null;

  const supabaseAnonKey = customKey || envKey || DEFAULT_SUPABASE_ANON_KEY;

  return { supabaseUrl, supabaseAnonKey };
}

export function saveCustomSupabaseConfig(customUrl, customAnonKey) {
  const trimmedUrl = typeof customUrl === 'string' ? customUrl.trim().replace(/\/+$/, '') : '';
  const trimmedKey = typeof customAnonKey === 'string' ? customAnonKey.trim() : '';

  if (!isValidHttpUrl(trimmedUrl)) {
    throw new Error('請輸入有效的 Supabase Project URL（必須以 https:// 或 http:// 開頭）');
  }
  if (!trimmedKey || trimmedKey.length < 16) {
    throw new Error('請輸入有效的 Supabase Anon Public Key');
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('mei_custom_supabase_url', trimmedUrl);
      window.localStorage.setItem('mei_custom_supabase_anon_key', trimmedKey);
    }
  } catch {
    // Ignore storage access errors
  }

  return getEffectiveSupabaseConfig();
}

export function clearCustomSupabaseConfig() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('mei_custom_supabase_url');
      window.localStorage.removeItem('mei_custom_supabase_anon_key');
    }
  } catch {
    // Ignore storage access errors
  }
  return getEffectiveSupabaseConfig();
}

const clientOptions = {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'mei_studio_supabase_auth_token_v1',
    experimental: {
      passkey: true
    }
  }
};

function createSafeSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getEffectiveSupabaseConfig();
  try {
    return createClient(supabaseUrl, supabaseAnonKey, clientOptions);
  } catch (error) {
    console.error('Failed to initialize Supabase client with effective config, falling back to defaults:', error);
    try {
      return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, clientOptions);
    } catch (fallbackError) {
      console.error('Critical failure initializing fallback Supabase client:', fallbackError);
      return null;
    }
  }
}

export const supabase = createSafeSupabaseClient();
