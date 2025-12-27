import { spawn, ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
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

function startWorker(): void {
  const isDev = process.env.SKER_DAEMON === '1' && __filename.endsWith('.ts');
  const workerPath = join(__dirname, isDev ? 'worker.ts' : 'worker.js');

  let execPath: string;
  let execArgs: string[];

  if (isDev) {
    const tsxCli = getTsxPath();
    if (!tsxCli) {
      logger.error('tsx not found in node_modules');
      process.exit(1);
    }
    // 使用 node 执行 tsx 的 CLI，然后传递 worker 文件
    execPath = process.execPath;
    execArgs = [tsxCli, workerPath];
  } else {
    execPath = process.execPath;
    execArgs = [workerPath];
  }

  worker = spawn(execPath, execArgs, {
    detached: true,
    stdio: 'ignore', // 忽略标准输入输出，防止继承控制台
    windowsHide: true, // Windows: 隐藏控制台窗口
    env: { ...process.env, SKER_DAEMON: '1' }
  });

  worker.unref(); // 允许父进程退出而不等待子进程

  worker.on('exit', (code) => {
    logger.log(`Worker exited with code ${code}`);
    worker = null;
    scheduleRestart();
  });

  logger.log(`Worker started (PID: ${worker.pid})`);
}

function scheduleRestart(): void {
  if (retryCount >= MAX_RETRIES) {
    logger.error('Max retries reached, stopping watchdog');
    process.exit(1);
  }

  const delay = Math.min(BACKOFF_BASE * Math.pow(2, retryCount), BACKOFF_MAX);
  retryCount++;
  logger.log(`Scheduling restart in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);

  restartTimer = setTimeout(() => {
    startWorker();
  }, delay);
}

function checkHealth(): void {
  if (!worker) return;

  if (isHeartbeatStale(HEARTBEAT_TIMEOUT)) {
    logger.error('Heartbeat timeout, killing worker');
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
