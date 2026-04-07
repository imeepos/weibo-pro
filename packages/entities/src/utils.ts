
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
      poolSize: 20, // 增加连接池大小，防止连接池耗尽
      connectTimeoutMS: 10000,
      extra: {
        timezone: 'UTC',
        max: 20, // 最大连接数增加到 20
        min: 2, // 最小连接数增加到 2，保持热连接
        idleTimeoutMillis: 30 * 1000, // 空闲超时增加到 30 秒，减少频繁创建连接
        connectionTimeoutMillis: 10 * 1000,
        statement_timeout: 10 * 60 * 1000,
        query_timeout: 30 * 60 * 1000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10 * 1000,
        // 连接回收，防止连接泄漏
        evictionRunIntervalMillis: 5 * 1000,
        softIdleTimeoutMillis: 5 * 1000,
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

const reconnectDataSource = async (dataSource: DataSource): Promise<void> => {
  try {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await dataSource.initialize();
    console.log('[DataSource] reconnected successfully');
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
      await reconnectDataSource(ds);
      return ds;
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

export const useEntityManager = async <T>(h: (m: EntityManager) => Promise<T>): Promise<T> => {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ds = await useDataSource();
      const m = ds.createEntityManager();
      return await h(m);
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
        error?.message?.includes('remaining connection slots are reserved');

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
    }
  }

  throw lastError;
};

export const useTranslation = async <T>(h: (m: EntityManager) => Promise<T>) => {
  return await useEntityManager(async m => {
    return m.transaction(h)
  })
}

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
  },
  {
    provide: EntityManager,
    useFactory: (ds: DataSource) => {
      return ds.createEntityManager()
    },
    deps: [DataSource]
  }
]
