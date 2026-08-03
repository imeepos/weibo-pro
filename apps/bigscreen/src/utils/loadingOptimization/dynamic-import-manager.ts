/**
 * 动态导入管理器
 */

import { createLogger } from '../logger';

const logger = createLogger('LoadingOptimization');

/**
 * 动态导入管理器
 */
export class DynamicImportManager {
  private static instance: DynamicImportManager;
  private importCache = new Map<string, Promise<any>>();
  private moduleCache = new Map<string, any>();

  static getInstance(): DynamicImportManager {
    if (!DynamicImportManager.instance) {
      DynamicImportManager.instance = new DynamicImportManager();
    }
    return DynamicImportManager.instance;
  }

  /**
   * 缓存导入
   */
  async importWithCache<T = any>(
    modulePath: string,
    importFn: () => Promise<T>
  ): Promise<T> {
    // 检查模块缓存
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }

    // 检查导入缓存
    if (this.importCache.has(modulePath)) {
      return this.importCache.get(modulePath);
    }

    // 开始导入
    const importPromise = importFn()
      .then(module => {
        this.moduleCache.set(modulePath, module);
        this.importCache.delete(modulePath);
        logger.debug('Module imported and cached', { modulePath });
        return module;
      })
      .catch(error => {
        this.importCache.delete(modulePath);
        logger.error('Module import failed', error);
        throw error;
      });

    this.importCache.set(modulePath, importPromise);
    return importPromise;
  }

  /**
   * 预热模块
   */
  async warmupModule(modulePath: string, importFn: () => Promise<any>): Promise<void> {
    try {
      await this.importWithCache(modulePath, importFn);
      logger.debug('Module warmed up', { modulePath });
    } catch (error) {
      logger.warn('Module warmup failed', { modulePath, error });
    }
  }

  /**
   * 批量预热模块
   */
  async warmupModules(modules: Array<{
    path: string;
    importFn: () => Promise<any>;
  }>): Promise<void> {
    const promises = modules.map(({ path, importFn }) =>
      this.warmupModule(path, importFn)
    );

    await Promise.allSettled(promises);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.importCache.clear();
    this.moduleCache.clear();
  }

  /**
   * 获取缓存状态
   */
  getCacheStats(): {
    importCacheSize: number;
    moduleCacheSize: number;
    cachedModules: string[];
  } {
    return {
      importCacheSize: this.importCache.size,
      moduleCacheSize: this.moduleCache.size,
      cachedModules: Array.from(this.moduleCache.keys()),
    };
  }
}
