
import { DataSource, DataSourceOptions, EntityManager } from 'typeorm';
import { ENTITY } from "./decorator";
import { APP_INITIALIZER, Initializer, Provider, root, Inject } from '@sker/core';
import { RedisClient } from '@sker/redis';
import { WorkflowScheduleSubscriber } from './subscribers/workflow-schedule.subscriber';

export const createDatabaseConfig = (): DataSourceOptions => {
  const databaseUrl = process.env.DATABASE_URL;
  const entities = [...new Set(root.get(ENTITY, []))]

  // 只允许显式开启 synchronize 的应用执行表同步
  // 避免多个应用并发 synchronize 导致类型冲突
  const shouldSync = process.env.TYPEORM_SYNCHRONIZE === 'true';

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      subscribers: [WorkflowScheduleSubscriber],
      synchronize: shouldSync,
      logging: false,

      // TypeORM 连接池配置
      poolSize: 50, // 增加连接池大小以应对高并发

      // PostgreSQL 驱动额外配置
      extra: {
        timezone: 'UTC',

        // 连接池大小（与 poolSize 保持一致）
        max: 50,

        // 最小连接数：保持一些热连接
        min: 5,

        // 连接超时设置
        connectionTimeoutMillis: 10 * 1000, // 获取连接超时 10 秒

        // 空闲连接管理（关键：减少 idle 连接累积）
        idleTimeoutMillis: 10 * 1000, // 空闲 10 秒后回收（从 30 秒减少）

        // 查询超时设置
        statement_timeout: 5 * 60 * 1000, // 单语句超时 5 分钟
        query_timeout: 10 * 60 * 1000, // 查询总超时 10 分钟

        // TCP Keep-Alive（防止连接被防火墙关闭）
        keepAlive: true,
        keepAliveInitialDelayMillis: 10 * 1000,

        // 连接回收策略（防止连接泄漏）
        evictionRunIntervalMillis: 2 * 1000, // 每 2 秒检查一次空闲连接（从 5 秒减少）
        softIdleTimeoutMillis: 5 * 1000, // 软空闲超时 5 秒（从 5 秒保持）
        numTestsPerEvictionRun: 10, // 每次回收检查的连接数

        // 连接验证（确保从池中获取的连接是有效的）
        testOnBorrow: true, // 从池中获取时验证连接
      },
    };
  }
  throw new Error(`not found DATABASE_URL`)
};

export const createDataSource = () => {
  return new DataSource(createDatabaseConfig())
}
let ds: DataSource | null = null;

const isConnectionAlive = async (dataSource: DataSource): Promise<boolean> => {
  try {
    await dataSource.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

const reconnectDataSource = async (): Promise<DataSource> => {
  try {
    // 销毁旧的连接
    if (ds && ds.isInitialized) {
      await ds.destroy();
      console.log('[DataSource] old connection destroyed');
    }
    // 创建新的 DataSource 实例
    ds = createDataSource();
    await ds.initialize();
    console.log('[DataSource] reconnected successfully with new instance');
    return ds;
  } catch (error) {
    console.error('[DataSource] reconnection failed:', error);
    throw error;
  }
};

export const useDataSource = async () => {
  if (ds) {
    if (ds.isInitialized) {
      const isAlive = await isConnectionAlive(ds);
      if (isAlive) {
        return ds;
      }
      console.warn('[DataSource] connection lost, attempting to reconnect...');
      return await reconnectDataSource();
    }
    try {
      await ds.initialize();
      return ds;
    } catch (error) {
      console.error('[DataSource] initialization failed:', error);
      throw error;
    }
  }

  const start = Date.now();
  ds = createDataSource();
  try {
    await ds.initialize();
    const syncStatus = process.env.TYPEORM_SYNCHRONIZE === 'true' ? '🔄 with sync' : '📌 without sync';
    console.log(`[DataSource] initialized in ${Date.now() - start}ms ${syncStatus}`);
    return ds;
  } catch (error) {
    console.error('[DataSource] creation failed:', error);
    throw error;
  }
};

/**
 * 使用 EntityManager 执行操作（自动释放连接）
 *
 * ⚠️ 重要：每次使用完毕后会自动释放 EntityManager，避免连接泄漏
 * 如需事务，请使用 useTransaction
 */
export const useEntityManager = async <T>(h: (m: EntityManager) => Promise<T>): Promise<T> => {
  const maxRetries = 2;
  let lastError: Error | null = null;
  let manager: EntityManager | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ds = await useDataSource();
      manager = ds.createEntityManager();

      const result = await h(manager);

      // 操作成功后立即释放 EntityManager
      await releaseEntityManager(manager);
      manager = null;

      return result;
    } catch (error: any) {
      lastError = error;
      const isConnectionError =
        error?.message?.includes('ECONNRESET') ||
        error?.message?.includes('Connection terminated') ||
        error?.message?.includes('Connection lost') ||
        error?.code === 'ECONNRESET';

      // 连接池耗尽错误不进行重试，直接抛出
      const isPoolExhausted =
        error?.code === '53300' ||
        error?.message?.includes('too many clients') ||
        error?.message?.includes('remaining connection slots are reserved') ||
        error?.message?.includes('connection pool exhausted');

      if (isPoolExhausted) {
        console.error(`[EntityManager] connection pool exhausted, not retrying. Code: ${error?.code}`);
        throw error;
      }

      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[EntityManager] connection error on attempt ${attempt + 1}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      throw error;
    } finally {
      // 确保在任何情况下都释放 EntityManager
      if (manager) {
        try {
          await releaseEntityManager(manager);
        } catch (releaseError) {
          console.error('[EntityManager] failed to release:', releaseError);
        }
      }
    }
  }

  throw lastError;
};

/**
 * 释放 EntityManager 及其持有的连接
 */
async function releaseEntityManager(manager: EntityManager): Promise<void> {
  // TypeORM 的 EntityManager 需要通过 QueryRunner 释放连接
  // 如果有 queryRunner，先释放它
  const queryRunner = (manager as any).queryRunner;
  if (queryRunner && typeof queryRunner.release === 'function') {
    await queryRunner.release();
  }
}

/**
 * 使用事务执行操作（自动释放连接）
 *
 * ⚠️ 重要：事务完成后会自动释放连接，避免连接泄漏
 */
export const useTransaction = async <T>(h: (m: EntityManager) => Promise<T>) => {
  const ds = await useDataSource();
  const queryRunner = ds.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const manager = queryRunner.manager;
    const result = await h(manager);

    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // 确保释放 QueryRunner
    await queryRunner.release();
  }
}

/**
 * @deprecated 请使用 useTransaction 代替
 * useTranslation 命名有误，保留用于向后兼容
 */
export const useTranslation = useTransaction;

/**
 * 获取已初始化的 DataSource（同步）
 * 如果未初始化则抛出错误
 */
const getInitializedDataSource = (): DataSource => {
  if (!ds || !ds.isInitialized) {
    throw new Error('DataSource not initialized. Please ensure entitiesProviders is registered and APP_INITIALIZER has run.')
  }
  return ds
}

/**
 * 使用 QueryRunner 执行操作（最安全的模式）
 *
 * 提供最细粒度的连接控制，适合复杂操作
 * 自动管理连接生命周期，避免连接泄漏
 */
export const useQueryRunner = async <T>(h: (qr: import('typeorm').QueryRunner) => Promise<T>): Promise<T> => {
  const ds = await useDataSource();
  const queryRunner = ds.createQueryRunner();

  try {
    await queryRunner.connect();
    return await h(queryRunner);
  } finally {
    // 确保释放 QueryRunner
    await queryRunner.release();
  }
}

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

export const entitiesProviders: Provider[] = [
  {
    provide: APP_INITIALIZER,
    useFactory: () => {
      return {
        init: async () => {
          await useDataSource()
        }
      } as Initializer
    },
    multi: true
  },
  {
    provide: DataSource,
    useFactory: () => {
      return getInitializedDataSource()
    },
    deps: []
  }
  // ❌ 移除 EntityManager 单例 Provider
  // EntityManager 每次使用都应该创建新实例，用完后释放
  // 请使用 useEntityManager、useTransaction 或 useQueryRunner 代替
]
