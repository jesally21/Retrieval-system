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
  return '';
}

const supabaseUrl = readBuildEnv('REACT_APP_SUPABASE_URL')
  || readBuildEnv('NEXT_PUBLIC_SUPABASE_URL')
  || readBuildEnv('SUPABASE_URL')
  || readRuntimeEnv('REACT_APP_SUPABASE_URL')
  || readRuntimeEnv('NEXT_PUBLIC_SUPABASE_URL')
  || readRuntimeEnv('SUPABASE_URL');
const supabaseAnonKey = readBuildEnv('REACT_APP_SUPABASE_ANON_KEY')
  || readBuildEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  || readBuildEnv('SUPABASE_ANON_KEY')
  || readRuntimeEnv('REACT_APP_SUPABASE_ANON_KEY')
  || readRuntimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  || readRuntimeEnv('SUPABASE_ANON_KEY');

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
};

export const supabase = supabaseConfig.isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
