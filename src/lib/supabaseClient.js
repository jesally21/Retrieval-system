import { createClient } from '@supabase/supabase-js';

function readRuntimeEnv(name) {
  if (typeof window === 'undefined') return '';
  return String(window.__ENV__?.[name] || '').trim();
}

function readBuildEnv(name) {
  if (name === 'REACT_APP_SUPABASE_URL') return String(process.env.REACT_APP_SUPABASE_URL || '').trim();
  if (name === 'REACT_APP_SUPABASE_ANON_KEY') return String(process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim();
  if (name === 'NEXT_PUBLIC_SUPABASE_URL') return String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  if (name === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') return String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (name === 'SUPABASE_URL') return String(process.env.SUPABASE_URL || '').trim();
  if (name === 'SUPABASE_ANON_KEY') return String(process.env.SUPABASE_ANON_KEY || '').trim();
  if (name === 'VITE_SUPABASE_URL') return String(process.env.VITE_SUPABASE_URL || '').trim();
  if (name === 'VITE_SUPABASE_ANON_KEY') return String(process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return '';
}

function isLocalhostUrl(value) {
  const text = String(value || '').trim();
  if (!text) return false;

  try {
    const parsed = new URL(text);
    return ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(parsed.hostname);
  } catch {
    return /(?:^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:\/|$)/i.test(text);
  }
}

function shouldKeepCandidate(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  try {
    const parsed = new URL(text);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  } catch {
    return false;
  }
  if (process.env.NODE_ENV !== 'production') return true;
  return !isLocalhostUrl(text);
}

function normalizeSupabaseUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  try {
    const parsed = new URL(text);
    return `${parsed.origin}/`;
  } catch {
    return '';
  }
}

function collectSupabaseUrls() {
  return [
    readRuntimeEnv('REACT_APP_SUPABASE_URL'),
    readRuntimeEnv('SUPABASE_URL'),
    readRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL'),
    readRuntimeEnv('VITE_SUPABASE_URL'),
    readBuildEnv('REACT_APP_SUPABASE_URL'),
    readBuildEnv('SUPABASE_URL'),
    readBuildEnv('NEXT_PUBLIC_SUPABASE_URL'),
    readBuildEnv('VITE_SUPABASE_URL'),
  ]
    .map(normalizeSupabaseUrl)
    .filter(shouldKeepCandidate)
    .filter((value, index, array) => array.indexOf(value) === index);
}

export const supabaseUrlCandidates = collectSupabaseUrls();
const supabaseAnonKey = readRuntimeEnv('REACT_APP_SUPABASE_ANON_KEY')
  || readRuntimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  || readRuntimeEnv('SUPABASE_ANON_KEY')
  || readRuntimeEnv('VITE_SUPABASE_ANON_KEY')
  || readBuildEnv('REACT_APP_SUPABASE_ANON_KEY')
  || readBuildEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  || readBuildEnv('SUPABASE_ANON_KEY')
  || readBuildEnv('VITE_SUPABASE_ANON_KEY');

export const supabaseConfig = {
  url: supabaseUrlCandidates[0] || '',
  anonKey: supabaseAnonKey,
  isConfigured: Boolean(supabaseUrlCandidates.length && supabaseAnonKey),
};

export const supabaseClients = supabaseConfig.isConfigured
  ? supabaseUrlCandidates.map((url) => createClient(url, supabaseAnonKey, {
    auth: {
      storageKey: 'bmpc-document-retrieval-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }))
  : [];

export const supabase = supabaseClients[0] || null;
