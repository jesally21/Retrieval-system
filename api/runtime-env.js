const { URL } = require('url');

function readEnv(name, fallback = '') {
  const value = process.env[name] || process.env[fallback] || '';
  return String(value || '').trim();
}

module.exports = function handler(req, res) {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  if (requestUrl.pathname !== '/api/runtime-env' && requestUrl.pathname !== '/api/runtime-env.js') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Not found.' }));
  }

  const runtimeEnv = {
    SUPABASE_URL: readEnv('SUPABASE_URL', 'REACT_APP_SUPABASE_URL'),
    SUPABASE_ANON_KEY: readEnv('SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY'),
    REACT_APP_SUPABASE_URL: readEnv('REACT_APP_SUPABASE_URL', 'SUPABASE_URL'),
    REACT_APP_SUPABASE_ANON_KEY: readEnv('REACT_APP_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'),
    NEXT_PUBLIC_SUPABASE_URL: readEnv('SUPABASE_URL', 'REACT_APP_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv('SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY'),
    REACT_APP_ADMIN_API_URL: readEnv('REACT_APP_ADMIN_API_URL', 'ADMIN_API_URL'),
    NEXT_PUBLIC_ADMIN_API_URL: readEnv('REACT_APP_ADMIN_API_URL', 'ADMIN_API_URL'),
  };

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.end(`window.__ENV__ = ${JSON.stringify(runtimeEnv)};`);
};
