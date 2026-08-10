const { spawn } = require('child_process');
const { spawnSync } = require('child_process');
const path = require('path');
const net = require('net');

const isWin = process.platform === 'win32';

async function isApiHealthy(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const isFree = await new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });
    if (isFree) return port;
  }
  return startPort;
}

function stopStaleApiProcesses() {
  if (!isWin) return;
  const script = [
    '$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*dev-api-server.js*" }',
    'foreach ($proc in $procs) { Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue }',
  ].join('; ');
  spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    stdio: 'ignore',
    windowsHide: true,
  });
}

function launch(command, args, label, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`${label} exited with ${signal || code}`);
    shutdown(code || 1);
  });

  return child;
}

function withDefinedEnv(baseEnv, extraEnv) {
  const nextEnv = { ...baseEnv };
  for (const [key, value] of Object.entries(extraEnv)) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (!text) continue;
    nextEnv[key] = text;
  }
  return nextEnv;
}

function killProcessTree(proc) {
  if (!proc || proc.killed) return;
  if (isWin) {
    spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  try {
    proc.kill('SIGTERM');
  } catch {
    // ignore cleanup failures
  }
}

let shuttingDown = false;
let api = null;
let client = null;
let apiOwned = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const proc of [client, apiOwned ? api : null]) {
    killProcessTree(proc);
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
  const apiPort = Number(process.env.API_PORT || 3001);
  const clientPort = Number(process.env.PORT || (await findFreePort(3000)));
  const upstreamSupabaseUrl = String(process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const upstreamSupabaseAnonKey = String(process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const sharedSupabaseEnv = withDefinedEnv(process.env, {
    REACT_APP_SUPABASE_URL: upstreamSupabaseUrl,
    REACT_APP_SUPABASE_ANON_KEY: upstreamSupabaseAnonKey,
    SUPABASE_URL: upstreamSupabaseUrl,
    SUPABASE_UPSTREAM_URL: upstreamSupabaseUrl,
    SUPABASE_UPSTREAM_ANON_KEY: upstreamSupabaseAnonKey,
  });

  if (!(await isApiHealthy(apiPort))) {
    stopStaleApiProcesses();
    await new Promise((resolve) => setTimeout(resolve, 500));
    apiOwned = true;
    api = launch(process.execPath, [path.join(__dirname, 'dev-api-server.js')], 'API', withDefinedEnv(sharedSupabaseEnv, {
      API_PORT: String(apiPort),
    }));
  } else {
    console.log(`Using existing API server on http://127.0.0.1:${apiPort}`);
  }

  // Windows needs a shell to run npm's .cmd shim directly.
  client = isWin
    ? launch(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run start:client'], 'Client', {
      ...withDefinedEnv(process.env, {
        PORT: String(clientPort),
        BROWSER: 'none',
        REACT_APP_SUPABASE_URL: upstreamSupabaseUrl,
        REACT_APP_SUPABASE_ANON_KEY: upstreamSupabaseAnonKey,
      }),
    })
    : launch('npm', ['run', 'start:client'], 'Client', withDefinedEnv(process.env, {
      PORT: String(clientPort),
      BROWSER: 'none',
      REACT_APP_SUPABASE_URL: upstreamSupabaseUrl,
      REACT_APP_SUPABASE_ANON_KEY: upstreamSupabaseAnonKey,
    }));
})();
