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
    if (!key || process.env[key] !== undefined) continue;
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
process.env.REACT_APP_SUPABASE_URL = process.env.REACT_APP_SUPABASE_PROXY_URL || `http://127.0.0.1:${port}/supabase`;
process.env.REACT_APP_SUPABASE_ANON_KEY = upstreamSupabaseAnonKey;

const adminHandler = require('./api/admin-user-management.js');
const requestHandler = require('./api/document-request-management.js');
const runtimeEnvHandler = require('./api/runtime-env.js');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
}

function buildSupabaseTargetUrl(requestUrl) {
  if (!upstreamSupabaseUrl) return null;
  const base = new URL(upstreamSupabaseUrl);
  const nextUrl = new URL(base.toString());
  const forwardedPath = requestUrl.pathname.replace(/^\/supabase/, '');
  nextUrl.pathname = `${base.pathname.replace(/\/$/, '')}${forwardedPath}`;
  nextUrl.search = requestUrl.search;
  return nextUrl;
}

async function proxySupabaseRequest(req, res, requestUrl) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    applyCors(res);
    return res.end();
  }

  const targetUrl = buildSupabaseTargetUrl(requestUrl);
  if (!targetUrl) {
    return sendJson(res, 500, { error: 'Missing upstream Supabase configuration.' });
  }

  let rawBody = '';
  for await (const chunk of req) {
    rawBody += chunk.toString('utf8');
  }

  const headers = { ...req.headers };
  if (!headers.apikey && upstreamSupabaseAnonKey) {
    headers.apikey = upstreamSupabaseAnonKey;
  }
  if (!headers.authorization && upstreamSupabaseAnonKey) {
    headers.authorization = `Bearer ${upstreamSupabaseAnonKey}`;
  }

  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(String(req.method || '').toUpperCase()) ? undefined : rawBody || undefined,
  });

  res.statusCode = upstreamResponse.status;
  applyCors(res);
  upstreamResponse.headers.forEach((value, key) => {
    const headerName = key.toLowerCase();
    if (!['connection', 'content-encoding', 'content-length', 'transfer-encoding'].includes(headerName)) {
      res.setHeader(key, value);
    }
  });

  const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
  return res.end(buffer);
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  if (requestUrl.pathname === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (requestUrl.pathname === '/api/runtime-env.js') {
    return runtimeEnvHandler(req, res);
  }

  if (requestUrl.pathname === '/supabase' || requestUrl.pathname.startsWith('/supabase/')) {
    return proxySupabaseRequest(req, res, requestUrl).catch((error) => {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Supabase proxy failed.' });
    });
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
    res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
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
