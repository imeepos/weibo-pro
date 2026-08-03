/**
 * 加载性能优化工具 - 统一导出
 * 提供资源优化、预加载和缓存策略
 */

export type { NetworkInformation } from './types';

export { ResourcePreloader } from './resource-preloader';
export { ImageLazyLoader } from './image-lazy-loader';
export { DynamicImportManager } from './dynamic-import-manager';
export { NetworkOptimizer } from './network-optimizer';

export { resourcePreloader, imageLazyLoader, dynamicImportManager, networkOptimizer } from './singletons';

export { intelligentPreload, optimizeImage, performantImport } from './strategies';
