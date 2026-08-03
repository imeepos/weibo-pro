import { DataSource } from 'typeorm';
import { APP_INITIALIZER, Initializer, Provider } from '@sker/core';
import { createDatabaseConfig } from './database-config';

export const createDataSource = () => {
  return new DataSource(createDatabaseConfig())
}
let ds: DataSource | null = null;
let initializingPromise: Promise<DataSource> | null = null;
let useDataSourceCallCount = 0; // 调用计数器

/**
 * 检查连接是否存活（仅用于诊断）
 *
 * ⚠️ 重要：不要在每次 useDataSource 调用时检查连接存活
 * 这会导致频繁的重连，进而累积大量未关闭的连接
 */
const _isConnectionAlive = async (dataSource: DataSource): Promise<boolean> => {
  try {
    await dataSource.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

/**
 * 重连数据源
 *
 * ⚠️ 警告：此函数会创建新的 DataSource 实例
 * 旧连接可能不会立即关闭，可能导致连接累积
 *
 * 应该仅在以下情况调用：
 * 1. DataSource 初始化失败
 * 2. 连接池已损坏且无法恢复
 */
const reconnectDataSource = async (): Promise<DataSource> => {
  try {
    // 销毁旧的连接
    if (ds && ds.isInitialized) {
      await ds.destroy();
      console.log('[DataSource] old connection destroyed');

      // 等待一段时间，确保 PostgreSQL 连接被关闭
      // PostgreSQL 可能需要一些时间来关闭 TIME_WAIT 状态的连接
      await new Promise(resolve => setTimeout(resolve, 1000));
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

/**
 * 初始化 DataSource（带锁机制，防止并发创建）
 */
const initializeDataSource = async (): Promise<DataSource> => {
  // 如果已经在初始化中，返回同一个 Promise
  if (initializingPromise) {
    console.log('[DataSource] Initialization already in progress, waiting...');
    return initializingPromise;
  }

  // 创建初始化 Promise
  initializingPromise = (async () => {
    // 再次检查，可能在等待期间已经被其他调用初始化了
    if (ds && ds.isInitialized) {
      initializingPromise = null;
      console.log('[DataSource] Already initialized, returning existing instance');
      return ds;
    }

    // 如果已创建但未初始化，尝试初始化
    if (ds) {
      try {
        await ds.initialize();
        initializingPromise = null;
        console.log('[DataSource] Initialized existing instance');
        return ds;
      } catch (error) {
        console.error('[DataSource] initialization failed:', error);
        initializingPromise = null;
        // 初始化失败，尝试重连
        return await reconnectDataSource();
      }
    }

    // 创建新的 DataSource
    const start = Date.now();
    ds = createDataSource();
    try {
      await ds.initialize();
      const syncStatus = process.env.TYPEORM_SYNCHRONIZE === 'true' ? '🔄 with sync' : '📌 without sync';
      console.log(`[DataSource] initialized in ${Date.now() - start}ms ${syncStatus}`);
      initializingPromise = null;
      return ds;
    } catch (error) {
      console.error('[DataSource] creation failed:', error);
      initializingPromise = null;
      ds = null; // 清理失败的实例
      throw error;
    }
  })();

  return initializingPromise;
};

/**
 * 获取已初始化的 DataSource
 *
 * 设计原则：
 * 1. DataSource 是单例，只创建一次
 * 2. 使用 Promise 锁防止并发初始化（竞态条件）
 * 3. 不要在每次调用时检查连接存活（避免频繁重连）
 * 4. 连接错误由具体的数据库操作处理（通过重试机制）
 * 5. 仅在初始化失败时才重连
 *
 * 根据 TypeORM 官方文档：
 * - EntityManager 不需要手动释放连接
 * - TypeORM 会自动从连接池获取和释放连接
 * - 连接池会自动管理连接的复用
 */
export const useDataSource = async () => {
  useDataSourceCallCount++;

  // 每 1000 次调用记录一次日志，用于监控
  if (useDataSourceCallCount % 1000 === 0) {
    console.log(`[DataSource] useDataSource called ${useDataSourceCallCount} times`);
  }

  // 快速路径：已初始化，直接返回（无锁）
  if (ds && ds.isInitialized) {
    return ds;
  }

  // 使用锁机制初始化，防止并发创建
  return await initializeDataSource();
};

/**
 * 获取 DataSource 使用统计（用于调试）
 */
export const getDataSourceStats = () => {
  return {
    isInitialized: ds?.isInitialized ?? false,
    callCount: useDataSourceCallCount,
    hasInitializingPromise: !!initializingPromise
  };
};

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
