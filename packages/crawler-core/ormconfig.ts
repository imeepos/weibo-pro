import { DataSource } from 'typeorm';
import * as entities from './src/entities';

const isDev = process.env.NODE_ENV !== 'production';

export const dataSource = new DataSource({
  type: (process.env.DB_TYPE as any) || 'sqlite',
  database: process.env.DB_PATH || './data/crawler.db',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: Object.values(entities),
  migrations: ['./src/migrations/*.ts'],
  synchronize: false,
  logging: isDev,
});
