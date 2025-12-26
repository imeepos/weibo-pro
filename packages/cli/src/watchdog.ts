import { spawn, ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isHeartbeatStale } from './heartbeat.js';
import { removePid, savePid } from './daemon.js';
import { createLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = createLogger();

const CHECK_INTERVAL = 10000;
const HEARTBEAT_TIMEOUT = 30000;
const MAX_RETRIES = 5;
const BACKOFF_BASE = 5000;
const BACKOFF_MAX = 60000;

let worker: ChildProcess | null = null;
let retryCount = 0;
let restartTimer: NodeJS.Timeout | null = null;

function startWorker(): void {
  const isDev = process.env.SKER_DAEMON === '1' && __filename.endsWith('.ts');
  const workerPath = join(__dirname, isDev ? 'worker.ts' : 'worker.js');

  worker = spawn(isDev ? 'tsx' : process.execPath, [workerPath], {
    stdio: 'inherit',
    env: { ...process.env, SKER_DAEMON: '1' }
  });

  worker.on('exit', (code) => {
    console.log(`Worker exited with code ${code}`);
    worker = null;
    scheduleRestart();
  });

  console.log(`Worker started (PID: ${worker.pid})`);
}

function scheduleRestart(): void {
  if (retryCount >= MAX_RETRIES) {
    console.error('Max retries reached, stopping watchdog');
    process.exit(1);
  }

  const delay = Math.min(BACKOFF_BASE * Math.pow(2, retryCount), BACKOFF_MAX);
  retryCount++;
  console.log(`Scheduling restart in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);

  restartTimer = setTimeout(() => {
    startWorker();
  }, delay);
}

function checkHealth(): void {
  if (!worker) return;

  if (isHeartbeatStale(HEARTBEAT_TIMEOUT)) {
    console.error('Heartbeat timeout, killing worker');
    worker.kill('SIGKILL');
    worker = null;
    scheduleRestart();
  } else {
    retryCount = 0;
  }
}

savePid(process.pid);
startWorker();
setInterval(checkHealth, CHECK_INTERVAL);

process.on('SIGTERM', () => {
  if (restartTimer) clearTimeout(restartTimer);
  if (worker) worker.kill('SIGTERM');
  removePid();
  process.exit(0);
});

process.on('SIGINT', () => {
  if (restartTimer) clearTimeout(restartTimer);
  if (worker) worker.kill('SIGTERM');
  removePid();
  process.exit(0);
});
