import type { DataSourceOptions } from 'typeorm';
import { ENTITY } from '../decorator';
import { root } from '@sker/core';
import { WorkflowScheduleSubscriber } from '../subscribers/workflow-schedule.subscriber';

/**
 * 构建数据库连接配置
 *
 * 从 DATABASE_URL 环境变量生成 TypeORM DataSourceOptions，
 * 并配置 PostgreSQL 连接池参数（防止连接泄漏）。
 */
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
        softIdleTimeoutMillis: 5 * 1000, // 软空闲超时 5 秒
        numTestsPerEvictionRun: 10, // 每次回收检查的连接数

        // 连接验证（确保从池中获取的连接是有效的）
        testOnBorrow: true, // 从池中获取时验证连接
      },
    };
  }
  throw new Error(`not found DATABASE_URL`)
};
