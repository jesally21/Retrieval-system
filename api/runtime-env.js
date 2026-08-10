function jsonString(value) {
  return JSON.stringify(String(value || '').trim());
}

function buildRuntimeEnv() {
  return {
    REACT_APP_ADMIN_API_URL: String(process.env.REACT_APP_ADMIN_API_URL || '').trim(),
    REACT_APP_DOCUMENT_REQUEST_API_URL: String(process.env.REACT_APP_DOCUMENT_REQUEST_API_URL || '').trim(),
    REACT_APP_SUPABASE_URL: String(process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim(),
    REACT_APP_SUPABASE_ANON_KEY: String(process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim(),
    NEXT_PUBLIC_SUPABASE_URL: String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    SUPABASE_URL: String(process.env.SUPABASE_URL || '').trim(),
    SUPABASE_ANON_KEY: String(process.env.SUPABASE_ANON_KEY || '').trim(),
    VITE_SUPABASE_URL: String(process.env.VITE_SUPABASE_URL || '').trim(),
    VITE_SUPABASE_ANON_KEY: String(process.env.VITE_SUPABASE_ANON_KEY || '').trim(),
    NEXT_PUBLIC_ADMIN_API_URL: String(process.env.NEXT_PUBLIC_ADMIN_API_URL || '').trim(),
  };
}

function handleRuntimeEnv(res, env) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.end(`window.__ENV__ = ${JSON.stringify(env)};`);
}

module.exports = function runtimeEnvHandler(req, res) {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  if (requestUrl.pathname !== '/api/runtime-env' && requestUrl.pathname !== '/api/runtime-env.js') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Not found.' }));
  }

  const runtimeEnv = buildRuntimeEnv();
  return handleRuntimeEnv(res, runtimeEnv);
};
