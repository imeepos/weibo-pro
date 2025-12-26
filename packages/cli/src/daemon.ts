import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PID_FILE = join(homedir(), '.sker', 'sker.pid');

export function getPid(): number | null {
  if (!existsSync(PID_FILE)) return null;
  const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    unlinkSync(PID_FILE);
    return null;
  }
}

export function savePid(pid: number): void {
  const dir = dirname(PID_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(PID_FILE, String(pid));
}

export function removePid(): void {
  if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
}

export function startDaemon(): void {
  if (getPid()) {
    console.log('Daemon already running');
    process.exit(1);
  }

  const isDev = process.env.SKER_DAEMON !== '1' && __filename.endsWith('.ts');
  const watchdogPath = join(__dirname, isDev ? 'watchdog.ts' : 'watchdog.js');
  const execArgs = isDev ? ['tsx', watchdogPath] : [watchdogPath];
  const execPath = isDev ? process.execPath.replace('node', 'tsx') : process.execPath;

  const child = spawn(isDev ? 'tsx' : process.execPath, isDev ? [watchdogPath] : [watchdogPath], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, SKER_DAEMON: '1' }
  });

  child.unref();
  console.log(`Watchdog started (PID: ${child.pid})`);
}

export function stopDaemon(): void {
  const pid = getPid();
  if (!pid) {
    console.log('Daemon not running');
    return;
  }
  process.kill(pid, 'SIGTERM');
  console.log(`Sent SIGTERM to PID ${pid}`);
}
