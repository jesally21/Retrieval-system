const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';

function launch(command, args, label) {
  const child = spawn(command, args, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`${label} exited with ${signal || code}`);
    shutdown(code || 1);
  });

  return child;
}

let shuttingDown = false;
const api = launch(process.execPath, [path.join(__dirname, 'dev-api-server.js')], 'API');
// Windows needs a shell to run npm's .cmd shim directly.
const client = isWin
  ? launch(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run start:client'], 'Client')
  : launch('npm', ['run', 'start:client'], 'Client');

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const proc of [api, client]) {
    if (proc && !proc.killed) {
      proc.kill();
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
