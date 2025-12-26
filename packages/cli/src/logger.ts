import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const LOG_DIR = join(homedir(), '.sker', 'logs');

export function createLogger() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

  const out = createWriteStream(join(LOG_DIR, 'sker.log'), { flags: 'a' });
  const err = createWriteStream(join(LOG_DIR, 'sker-error.log'), { flags: 'a' });

  const timestamp = () => new Date().toISOString();

  return {
    log: (msg: string) => out.write(`[${timestamp()}] ${msg}\n`),
    error: (msg: string) => err.write(`[${timestamp()}] ${msg}\n`),
    streams: { out, err }
  };
}
