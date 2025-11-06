
import { DataSourceOptions, EntityManager } from 'typeorm';
import { ENTITY } from "./decorator";
import { DataSource } from 'typeorm'
import { APP_INITIALIZER, Initializer, Provider, root } from '@sker/core'
import { WeiboPostSubscriber } from './weibo-post.subscriber';

export const createDatabaseConfig = (): DataSourceOptions => {
  const databaseUrl = process.env.DATABASE_URL;
  const entities = root.get(ENTITY, [])
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      subscribers: [WeiboPostSubscriber],
      synchronize: true,
      logging: false,
      poolSize: 10,
      extra: {
        timezone: 'UTC',
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
    };
  }
  throw new Error(`not found DATABASE_URL`)
};

export const createDataSource = () => {
  return new DataSource(createDatabaseConfig())
}
let ds: DataSource | null = null;
export const useDataSource = async () => {
  if (ds) {
    if (ds.isInitialized) return ds;
    const start = Date.now();
    await ds.initialize();
    console.log(`[DataSource] initialized in ${Date.now() - start}ms`);
    return ds;
  }
  const start = Date.now();
  ds = createDataSource()
  await ds.initialize();
  console.log(`[DataSource] created and initialized in ${Date.now() - start}ms`);
  return ds;
}

export const useEntityManager = async <T>(h: (m: EntityManager) => Promise<T>): Promise<T> => {
  const ds = await useDataSource()
  const m = ds.createEntityManager()
  const res = await h(m)
  return res;
}

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
    useFactory: () => {
      return ds
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
