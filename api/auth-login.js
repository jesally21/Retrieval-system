function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  Object.entries(corsHeaders()).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(body));
}

function getEnv(name) {
  const fallbackNames = {
    SUPABASE_URL: [
      'SUPABASE_UPSTREAM_URL',
      'REACT_APP_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_URL',
      'VITE_SUPABASE_URL',
    ],
    SUPABASE_ANON_KEY: [
      'SUPABASE_UPSTREAM_ANON_KEY',
      'REACT_APP_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_ANON_KEY',
      'VITE_SUPABASE_ANON_KEY',
    ],
  };
  const fallback = fallbackNames[name] || [];
  const value = process.env[name] || fallback.map((key) => process.env[key]).find(Boolean);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function readErrorMessage(response) {
  const text = await response.text().catch(() => '');
  if (!text) return '';
  try {
    const payload = JSON.parse(text);
    return payload?.error_description || payload?.error || payload?.message || text;
  } catch {
    return text;
  }
}

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '');

    if (!email || !password) {
      return json(res, 400, { error: 'Email and password are required.' });
    }

    const supabaseUrl = getEnv('SUPABASE_URL').replace(/\/+$/, '');
    const anonKey = getEnv('SUPABASE_ANON_KEY');

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error_description || data?.msg || data?.message || (await readErrorMessage(response)) || 'Login failed.';
      return json(res, response.status, { error: message });
    }

    return json(res, 200, {
      user: data?.user || null,
      session: data
        ? {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
            user: data.user || null,
          }
        : null,
    });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
};
