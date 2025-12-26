import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const HEARTBEAT_FILE = join(homedir(), '.sker', 'heartbeat.json');

export interface HeartbeatData {
  pid: number;
  timestamp: number;
  status: 'running' | 'starting';
}

export function writeHeartbeat(data: Partial<HeartbeatData> = {}): void {
  const dir = dirname(HEARTBEAT_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(HEARTBEAT_FILE, JSON.stringify({
    pid: process.pid,
    timestamp: Date.now(),
    status: 'running',
    ...data
  }));
}

export function readHeartbeat(): HeartbeatData | null {
  if (!existsSync(HEARTBEAT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(HEARTBEAT_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function isHeartbeatStale(timeout: number): boolean {
  const hb = readHeartbeat();
  if (!hb) return true;
  return Date.now() - hb.timestamp > timeout;
}
