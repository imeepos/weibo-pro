import type { EntityManager, QueryRunner } from 'typeorm';
import { getDataSourceStats, useDataSource } from './data-source';

/**
 * 使用 EntityManager 执行操作（自动管理连接）
 *
 * 根据 TypeORM 官方文档：
 * - EntityManager 不需要手动释放连接
 * - TypeORM 会自动从连接池获取和释放连接
 * - 连接池会自动管理连接的复用
 *
 * ⚠️ 如需事务控制，请使用 useTransaction
 */
export const useEntityManager = async <T>(h: (m: EntityManager) => Promise<T>): Promise<T> => {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const ds = await useDataSource();
      const manager = ds.createEntityManager();

      const result = await h(manager);

      // EntityManager 不需要手动释放
      // TypeORM 会自动管理连接池
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
        console.error(`[EntityManager] connection pool exhausted after ${attempt + 1} attempts. Code: ${error?.code}`);
        console.error('[EntityManager] Stats:', getDataSourceStats());
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
 * useTranslation 偏名有误，保留用于向后兼容
 */
export const useTranslation = useTransaction;

/**
 * 使用 QueryRunner 执行操作（最安全的模式）
 *
 * 提供最细粒度的连接控制，适合复杂操作
 * 自动管理连接生命周期，避免连接泄漏
 */
export const useQueryRunner = async <T>(h: (qr: QueryRunner) => Promise<T>): Promise<T> => {
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
