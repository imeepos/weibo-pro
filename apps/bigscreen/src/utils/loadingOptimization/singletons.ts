/**
 * 加载优化单例实例导出
 */

import { ResourcePreloader } from './resource-preloader';
import { ImageLazyLoader } from './image-lazy-loader';
import { DynamicImportManager } from './dynamic-import-manager';
import { NetworkOptimizer } from './network-optimizer';

export const resourcePreloader = ResourcePreloader.getInstance();
export const imageLazyLoader = ImageLazyLoader.getInstance();
export const dynamicImportManager = DynamicImportManager.getInstance();
export const networkOptimizer = NetworkOptimizer.getInstance();
