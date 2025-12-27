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

function getTsxPath(): string {
  // 在开发模式下，直接使用 tsx 的 CLI 入口
  // 判断是否在开发模式（src 目录）或构建模式（dist 目录）
  const isDev = __filename.endsWith('.ts');
  const baseDir = isDev ? join(__dirname, '..') : __dirname;

  // 尝试根目录的 node_modules (monorepo)
  const rootTsxCli = join(baseDir, '../../node_modules/tsx/dist/cli.mjs');
  if (existsSync(rootTsxCli)) {
    return rootTsxCli;
  }

  // 尝试当前包的 node_modules
  const localTsxCli = join(baseDir, 'node_modules/tsx/dist/cli.mjs');
  if (existsSync(localTsxCli)) {
    return localTsxCli;
  }

  // 降级方案：返回空字符串表示需要使用 process.execPath
  return '';
}

export function startDaemon(): void {
  if (getPid()) {
    console.log('Daemon already running');
    process.exit(1);
  }

  const isDev = process.env.SKER_DAEMON !== '1' && __filename.endsWith('.ts');
  const watchdogPath = join(__dirname, isDev ? 'watchdog.ts' : 'watchdog.js');

  let execPath: string;
  let execArgs: string[];

  if (isDev) {
    const tsxCli = getTsxPath();
    if (!tsxCli) {
      console.error('tsx not found in node_modules');
      process.exit(1);
    }
    // 使用 node 执行 tsx 的 CLI，然后传递 watchdog 文件
    execPath = process.execPath;
    execArgs = [tsxCli, watchdogPath];
  } else {
    execPath = process.execPath;
    execArgs = [watchdogPath];
  }

  const child = spawn(execPath, execArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true, // Windows: 隐藏控制台窗口
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
