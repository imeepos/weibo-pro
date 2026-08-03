import { rmSync, existsSync } from 'fs';

export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

export function log(message: string, color: keyof typeof colors = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

export function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

export function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

export function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan');
}

export function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

export function logTitle(message: string) {
  log(`\n${colors.bgBlue}${colors.bright}${message}${colors.reset}`, 'white');
}

export function removeIfExists(path: string): boolean {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    logError(`Failed to remove ${path}: ${error}`);
    return false;
  }
}
