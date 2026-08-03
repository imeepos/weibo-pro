import { useEntityManager } from '@sker/entities';
import type { CacheService } from '../cache.service';
import type { HealthCheck } from './system.types';

export async function checkDatabaseHealth(): Promise<HealthCheck> {
  try {
    await useEntityManager(async (manager) => {
      await manager.query('SELECT 1');
    });
    return {
      name: '数据库连接',
      status: '健康',
      message: '连接正常'
    };
  } catch (error) {
    return {
      name: '数据库连接',
      status: '异常',
      message: error instanceof Error ? error.message : '连接失败'
    };
  }
}

export async function checkRedisHealth(cacheService: CacheService): Promise<HealthCheck> {
  try {
    await cacheService.set('__health_check__', { ok: true }, 10);
    const result = await cacheService.get<{ ok: boolean }>('__health_check__');
    if (result?.ok) {
      return {
        name: '缓存服务',
        status: '健康',
        message: '响应正常'
      };
    }
    return {
      name: '缓存服务',
      status: '异常',
      message: '数据不一致'
    };
  } catch (error) {
    return {
      name: '缓存服务',
      status: '异常',
      message: error instanceof Error ? error.message : '连接失败'
    };
  }
}

export async function checkDiskSpaceHealth(): Promise<HealthCheck> {
  try {
    return useEntityManager(async (manager) => {
      const result = await manager.query(`
        SELECT pg_database_size(current_database()) as db_size
      `);
      const dbSizeMB = parseInt(result[0]?.db_size || '0') / (1024 * 1024);
      const totalDiskMB = 100 * 1024;
      const usagePercent = (dbSizeMB / totalDiskMB) * 100;

      if (usagePercent > 90) {
        return {
          name: '磁盘空间',
          status: '异常',
          message: `使用率过高: ${usagePercent.toFixed(1)}%`
        };
      }

      return {
        name: '磁盘空间',
        status: '健康',
        message: `使用率: ${usagePercent.toFixed(1)}%`
      };
    });
  } catch (error) {
    return {
      name: '磁盘空间',
      status: '异常',
      message: error instanceof Error ? error.message : '检查失败'
    };
  }
}

export async function checkWorkflowEngineHealth(): Promise<HealthCheck> {
  try {
    return useEntityManager(async (manager) => {
      const result = await manager.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM workflow_runs
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `);

      const total = parseInt(result[0]?.total || '0');
      const failed = parseInt(result[0]?.failed || '0');

      if (total === 0) {
        return {
          name: '工作流引擎',
          status: '健康',
          message: '无活动任务'
        };
      }

      const failureRate = (failed / total) * 100;
      if (failureRate > 50) {
        return {
          name: '工作流引擎',
          status: '异常',
          message: `失败率过高: ${failureRate.toFixed(1)}%`
        };
      }

      return {
        name: '工作流引擎',
        status: '健康',
        message: `运行正常 (${total} 个任务)`
      };
    });
  } catch (error) {
    return {
      name: '工作流引擎',
      status: '异常',
      message: error instanceof Error ? error.message : '检查失败'
    };
  }
}
