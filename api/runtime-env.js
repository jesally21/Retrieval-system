function jsonString(value) {
  return JSON.stringify(String(value || '').trim());
}

function buildRuntimeEnv() {
  return {
    REACT_APP_ADMIN_API_URL: String(process.env.REACT_APP_ADMIN_API_URL || '').trim(),
    REACT_APP_DOCUMENT_REQUEST_API_URL: String(process.env.REACT_APP_DOCUMENT_REQUEST_API_URL || '').trim(),
    REACT_APP_SUPABASE_PROXY_URL: String(process.env.REACT_APP_SUPABASE_PROXY_URL || '').trim(),
    REACT_APP_SUPABASE_URL: String(process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim(),
    REACT_APP_SUPABASE_ANON_KEY: String(process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim(),
    NEXT_PUBLIC_SUPABASE_URL: String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    NEXT_PUBLIC_SUPABASE_PROXY_URL: String(process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL || '').trim(),
    SUPABASE_URL: String(process.env.SUPABASE_URL || '').trim(),
    SUPABASE_ANON_KEY: String(process.env.SUPABASE_ANON_KEY || '').trim(),
    SUPABASE_PROXY_URL: String(process.env.SUPABASE_PROXY_URL || '').trim(),
    VITE_SUPABASE_URL: String(process.env.VITE_SUPABASE_URL || '').trim(),
    VITE_SUPABASE_ANON_KEY: String(process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
    VITE_SUPABASE_PROXY_URL: String(process.env.VITE_SUPABASE_PROXY_URL || '').trim(),
  };
}

module.exports = function runtimeEnvHandler(_req, res) {
  const env = buildRuntimeEnv();
  const script = `window.__ENV__ = ${JSON.stringify(env)};`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(script);
};
