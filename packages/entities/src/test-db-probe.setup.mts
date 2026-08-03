/**
 * DB 连通性快速探测 setup 文件
 *
 * 用途：L1 单元测试不应依赖真实 PostgreSQL（真实 PG 只用于 L3/E2E docker-compose）。
 * 本文件在测试文件加载前，用短超时（≤2s）探测 DATABASE_URL 指向的数据库，
 * 结果写入 globalThis.__SKER_DB_AVAILABLE__，
 * 供测试文件通过 `describe.skipIf(!globalThis.__SKER_DB_AVAILABLE__)` 快速跳过。
 *
 * 注意：vitest 在同一个 worker 内会多次加载 setup 文件（每个测试文件前一次），
 * 因此通过 globalThis 缓存探测结果，避免重复连接。
 */
import { Client } from 'pg';

const PROBE_TIMEOUT_MS = 2000;

async function probeDatabase(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return false;
  }

  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: PROBE_TIMEOUT_MS,
    query_timeout: PROBE_TIMEOUT_MS,
    statement_timeout: PROBE_TIMEOUT_MS,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function ensureProbeDone(): Promise<void> {
  // 每个 worker 内只探测一次，避免重复开销
  if ((globalThis as any).__SKER_DB_AVAILABLE__ === undefined) {
    (globalThis as any).__SKER_DB_AVAILABLE__ = await probeDatabase();
  }
}

// 顶层 await：确保探测完成后再加载测试文件
await ensureProbeDone();
