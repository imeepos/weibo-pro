import { useDataSource } from './data-source';

/**
 * 清理空闲的数据库连接
 *
 * 该函数用于终止空闲时间超过指定阈值的PostgreSQL连接，
 * 以防止连接池耗尽和连接泄露问题。
 *
 * @param idleThresholdMs - 空闲时间阈值（毫秒），默认30秒
 * @param minConnections - 最小保留连接数，默认5个
 * @returns 终止的连接数量
 */
export const cleanupIdleConnections = async (
  idleThresholdMs: number = 30000,
  minConnections: number = 5
): Promise<number> => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('[cleanupIdleConnections] DATABASE_URL not found');
    return 0;
  }

  // 只支持PostgreSQL
  if (!databaseUrl.startsWith('postgres')) {
    console.warn('[cleanupIdleConnections] Only PostgreSQL is supported');
    return 0;
  }

  try {
    const ds = await useDataSource();

    // 从DATABASE_URL提取数据库名
    const dbNameMatch = databaseUrl.match(/\/([^/?]+)(\?|$)/);
    const dbName = dbNameMatch ? dbNameMatch[1] : 'postgres';

    // 查询空闲连接
    const idleTimeThreshold = Math.floor(idleThresholdMs / 1000); // 转换为秒
    const query = `
      SELECT pid
      FROM pg_stat_activity
      WHERE datname = $1
        AND state = 'idle'
        AND state_change < NOW() - INTERVAL '${idleTimeThreshold} seconds'
        AND pid != pg_backend_pid()
      ORDER BY state_change ASC
    `;

    const idleConnections = await ds.query(query, [dbName]);

    // 保留最小连接数
    const connectionsToTerminate = idleConnections.slice(0, -minConnections || undefined);
    const terminateCount = connectionsToTerminate.length;

    if (terminateCount === 0) {
      console.log('[cleanupIdleConnections] No idle connections to terminate');
      return 0;
    }

    console.log(`[cleanupIdleConnections] Found ${idleConnections.length} idle connections, terminating ${terminateCount}`);

    // 终止空闲连接
    let terminatedCount = 0;
    for (const conn of connectionsToTerminate) {
      try {
        await ds.query('SELECT pg_terminate_backend($1)', [conn.pid]);
        terminatedCount++;
        console.log(`[cleanupIdleConnections] Terminated connection ${conn.pid}`);
      } catch (error: any) {
        // 连接可能已经关闭，忽略错误
        console.warn(`[cleanupIdleConnections] Failed to terminate connection ${conn.pid}:`, error.message);
      }
    }

    console.log(`[cleanupIdleConnections] Successfully terminated ${terminatedCount}/${terminateCount} connections`);
    return terminatedCount;
  } catch (error: any) {
    console.error('[cleanupIdleConnections] Error:', error);
    return 0;
  }
};
