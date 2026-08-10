const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key) continue;
    const currentValue = process.env[key];
    if (currentValue !== undefined && String(currentValue).trim() !== '') continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

loadDotEnv();

const port = Number(process.env.API_PORT || 3001);
const upstreamSupabaseUrl = String(
  process.env.SUPABASE_UPSTREAM_URL
    || process.env.REACT_APP_SUPABASE_URL
    || process.env.SUPABASE_URL
    || '',
).trim();
const upstreamSupabaseAnonKey = String(
  process.env.SUPABASE_UPSTREAM_ANON_KEY
    || process.env.REACT_APP_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || '',
).trim();

process.env.SUPABASE_UPSTREAM_URL = upstreamSupabaseUrl;
process.env.SUPABASE_UPSTREAM_ANON_KEY = upstreamSupabaseAnonKey;
process.env.REACT_APP_SUPABASE_URL = upstreamSupabaseUrl || process.env.REACT_APP_SUPABASE_URL || '';
process.env.REACT_APP_SUPABASE_ANON_KEY = upstreamSupabaseAnonKey;

const adminHandler = require('./api/admin-user-management.js');
const requestHandler = require('./api/document-request-management.js');
const runtimeEnvHandler = require('./api/runtime-env.js');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  if (requestUrl.pathname === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (requestUrl.pathname === '/api/runtime-env' || requestUrl.pathname === '/api/runtime-env.js') {
    return runtimeEnvHandler(req, res);
  }

  if (requestUrl.pathname === '/api/document-request-management') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk.toString('utf8');
    });
    req.on('end', async () => {
      const headers = {
        ...req.headers,
        authorization: req.headers.authorization || '',
      };

      const mockReq = {
        method: req.method,
        headers,
        body: rawBody,
      };

      const mockRes = {
        statusCode: 200,
        headers: {},
        setHeader(key, value) {
          this.headers[key] = value;
        },
        end(payload = '') {
          Object.entries(this.headers).forEach(([key, value]) => res.setHeader(key, value));
          res.statusCode = this.statusCode || 200;
          res.end(payload);
        },
      };

      try {
        await requestHandler(mockReq, mockRes);
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error.' });
      }
    });
    return;
  }

  if (requestUrl.pathname !== '/api/admin-user-management') {
    return sendJson(res, 404, { error: 'Not found.' });
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      String(req.headers['access-control-request-headers'] || 'authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, x-supabase-client-info, accept-profile, content-profile'),
    );
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.end();
  }

  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk.toString('utf8');
  });

  req.on('end', async () => {
    const headers = {
      ...req.headers,
      authorization: req.headers.authorization || '',
    };

    const mockReq = {
      method: req.method,
      headers,
      body: rawBody,
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      },
      end(payload = '') {
        Object.entries(this.headers).forEach(([key, value]) => res.setHeader(key, value));
        res.statusCode = this.statusCode || 200;
        res.end(payload);
      },
    };

    try {
      await adminHandler(mockReq, mockRes);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error.' });
    }
  });
});

server.listen(port, () => {
  console.log(`Admin API server listening on http://127.0.0.1:${port}`);
});
