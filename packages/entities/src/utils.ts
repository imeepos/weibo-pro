
import { DataSource, DataSourceOptions, EntityManager } from 'typeorm';
import { ENTITY } from "./decorator";
import { APP_INITIALIZER, Initializer, Provider, root } from '@sker/core'
import { WeiboPostSubscriber } from './weibo-post.subscriber';
import { WeiboPostHourlySubscriber } from './subscribers/weibo-post-hourly.subscriber';
import { WeiboCommentHourlySubscriber } from './subscribers/weibo-comment-hourly.subscriber';
import { WeiboLikeHourlySubscriber } from './subscribers/weibo-like-hourly.subscriber';
import { WeiboRepostHourlySubscriber } from './subscribers/weibo-repost-hourly.subscriber';
import { PostNLPHourlySubscriber } from './subscribers/post-nlp-hourly.subscriber';
import { WeiboRepostRelationSubscriber } from './subscribers/weibo-repost-relation.subscriber';
import { WeiboLikeRelationSubscriber } from './subscribers/weibo-like-relation.subscriber';
import { WeiboCommentRelationSubscriber } from './subscribers/weibo-comment-relation.subscriber';

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
      subscribers: [
        WeiboPostSubscriber,
        WeiboPostHourlySubscriber,
        WeiboCommentHourlySubscriber,
        WeiboLikeHourlySubscriber,
        WeiboRepostHourlySubscriber,
        PostNLPHourlySubscriber,
        WeiboRepostRelationSubscriber,
        WeiboLikeRelationSubscriber,
        WeiboCommentRelationSubscriber,
      ],
      synchronize: shouldSync,
      logging: false,
      poolSize: 30,
      connectTimeoutMS: 10000,
      extra: {
        timezone: 'UTC',
        max: 30,
        min: 5,
        idleTimeoutMillis: 30 * 1000,
        connectionTimeoutMillis: 30 * 1000,
        statement_timeout: 10 * 60 * 1000,
        query_timeout: 30 * 60 * 1000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10 * 1000,
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
    useFactory: () => ds!,
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
