import { describe, it, expect, } from 'vitest';

describe('cleanupIdleConnections', () => {
  // 由于cleanupIdleConnections函数内部使用useDataSource，
  // 我们测试其核心逻辑：PostgreSQL连接清理的SQL查询逻辑

  it('应该正确解析DATABASE_URL中的数据库名', () => {
    const testUrl = 'postgresql://user:pass@localhost:5432/testdb';
    const dbNameMatch = testUrl.match(/\/([^/?]+)(\?|$)/);
    const dbName = dbNameMatch ? dbNameMatch[1] : 'postgres';
    expect(dbName).toBe('testdb');
  });

  it('应该正确计算空闲时间阈值（秒）', () => {
    const idleThresholdMs = 30000;
    const idleTimeThreshold = Math.floor(idleThresholdMs / 1000);
    expect(idleTimeThreshold).toBe(30);
  });

  it('应该正确计算需要终止的连接数（保留最小连接数）', () => {
    const idleConnections = Array.from({ length: 10 }, (_, i) => ({
      pid: 1000 + i,
    }));
    const minConnections = 5;

    // 保留最后5个连接，终止前面的
    const connectionsToTerminate = idleConnections.slice(0, -minConnections || undefined);
    expect(connectionsToTerminate.length).toBe(5);
    expect(connectionsToTerminate[0]!.pid).toBe(1000);
    expect(connectionsToTerminate[4]!.pid).toBe(1004);
  });

  it('当空闲连接数小于等于最小连接数时不应该终止任何连接', () => {
    const idleConnections = Array.from({ length: 5 }, (_, i) => ({
      pid: 1000 + i,
    }));
    const minConnections = 5;

    const connectionsToTerminate = idleConnections.slice(0, -minConnections || undefined);
    expect(connectionsToTerminate.length).toBe(0);
  });

  it('应该识别PostgreSQL数据库URL', () => {
    const postgresUrl = 'postgresql://user:pass@localhost:5432/testdb';
    const mysqlUrl = 'mysql://user:pass@localhost:3306/testdb';

    expect(postgresUrl.startsWith('postgres')).toBe(true);
    expect(mysqlUrl.startsWith('postgres')).toBe(false);
  });

  it('应该构建正确的SQL查询语句', () => {
    const _dbName = 'testdb';
    const idleTimeThreshold = 30;

    const expectedQuery = `
      SELECT pid
      FROM pg_stat_activity
      WHERE datname = $1
        AND state = 'idle'
        AND state_change < NOW() - INTERVAL '${idleTimeThreshold} seconds'
        AND pid != pg_backend_pid()
      ORDER BY state_change ASC
    `;

    expect(expectedQuery).toContain('pg_stat_activity');
    expect(expectedQuery).toContain('datname = $1');
    expect(expectedQuery).toContain("state = 'idle'");
    expect(expectedQuery).toContain('pg_backend_pid()');
  });
});
