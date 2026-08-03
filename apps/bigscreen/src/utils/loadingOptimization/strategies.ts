/**
 * 便捷加载策略函数
 */

import { createLogger } from '../logger';
import { resourcePreloader } from './singletons';
import { imageLazyLoader } from './singletons';
import { networkOptimizer } from './singletons';
import { dynamicImportManager } from './singletons';

const logger = createLogger('LoadingOptimization');

/**
 * 智能预加载策略
 */
export async function intelligentPreload(options: {
  critical?: string[];
  normal?: string[];
  defer?: string[];
}): Promise<void> {
  const { critical = [], normal = [], defer = [] } = options;
  const connectionInfo = networkOptimizer.getConnectionInfo();

  // 关键资源立即加载
  if (critical.length > 0) {
    await resourcePreloader.preloadResources({
      modules: critical,
    });
  }

  // 根据网络状况决定是否加载普通资源
  if (!connectionInfo.isSlowConnection && normal.length > 0) {
    setTimeout(() => {
      resourcePreloader.preloadResources({
        modules: normal,
      });
    }, 1000);
  }

  // 延迟资源在空闲时加载
  if (defer.length > 0) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        resourcePreloader.preloadResources({
          modules: defer,
        });
      });
    } else {
      setTimeout(() => {
        resourcePreloader.preloadResources({
          modules: defer,
        });
      }, 5000);
    }
  }
}

/**
 * 优化图片元素
 */
export function optimizeImage(img: HTMLImageElement, options: {
  lazy?: boolean;
  quality?: 'low' | 'medium' | 'high';
  placeholder?: string;
} = {}): void {
  const { lazy = true, placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4=' } = options;

  if (lazy) {
    // 设置懒加载
    const originalSrc = img.src;
    img.src = placeholder;
    img.dataset.src = originalSrc;
    img.classList.add('lazy');

    // 启动懒加载观察
    imageLazyLoader.observe(img);
  }

  // 根据网络状况调整图片质量
  const quality = options.quality || networkOptimizer.getRecommendedImageQuality();
  if (quality === 'low') {
    img.style.imageRendering = 'pixelated';
  }
}

/**
 * 性能友好的动态导入
 */
export async function performantImport<T>(
  modulePath: string,
  importFn: () => Promise<T>,
  options: {
    timeout?: number;
    fallback?: T;
  } = {}
): Promise<T> {
  const { timeout = 10000, fallback } = options;

  try {
    // 使用缓存的动态导入
    const result = await Promise.race([
      dynamicImportManager.importWithCache(modulePath, importFn),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Import timeout')), timeout)
      ),
    ]);

    return result;
  } catch (error) {
    logger.error('Performance import failed', error);

    if (fallback !== undefined) {
      return fallback;
    }

    throw error;
  }
}
