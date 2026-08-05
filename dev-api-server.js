const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const adminHandler = require('./api/admin-user-management.js');

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
