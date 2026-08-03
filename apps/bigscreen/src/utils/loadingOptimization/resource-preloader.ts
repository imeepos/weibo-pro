/**
 * 资源预加载
 */

import { createLogger } from '../logger';

const logger = createLogger('LoadingOptimization');

/**
 * 预加载关键资源
 */
export class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedResources = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();

  static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  /**
   * 预加载JavaScript模块
   */
  async preloadModule(modulePath: string): Promise<any> {
    if (this.preloadedResources.has(modulePath)) {
      return this.preloadPromises.get(modulePath);
    }

    const preloadPromise = import(/* webpackChunkName: "preload" */ modulePath)
      .then(module => {
        this.preloadedResources.add(modulePath);
        logger.debug('Module preloaded successfully', { modulePath });
        return module;
      })
      .catch(error => {
        logger.error('Module preload failed', error);
        throw error;
      });

    this.preloadPromises.set(modulePath, preloadPromise);
    return preloadPromise;
  }

  /**
   * 预加载图片资源
   */
  async preloadImage(src: string): Promise<HTMLImageElement> {
    if (this.preloadedResources.has(src)) {
      return Promise.resolve(new Image());
    }

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.preloadedResources.add(src);
        logger.debug('Image preloaded successfully', { src });
        resolve(img);
      };

      img.onerror = (error) => {
        logger.error('Image preload failed', error);
        reject(error);
      };

      img.src = src;
    });
  }

  /**
   * 预加载CSS文件
   */
  async preloadCSS(href: string): Promise<void> {
    if (this.preloadedResources.has(href)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;

      link.onload = () => {
        this.preloadedResources.add(href);
        logger.debug('CSS preloaded successfully', { href });
        resolve();
      };

      link.onerror = (error) => {
        logger.error('CSS preload failed', error);
        reject(error);
      };

      document.head.appendChild(link);
    });
  }

  /**
   * 预加载字体
   */
  async preloadFont(fontUrl: string, fontFamily: string): Promise<void> {
    if (this.preloadedResources.has(fontUrl)) {
      return Promise.resolve();
    }

    try {
      const font = new FontFace(fontFamily, `url(${fontUrl})`);
      await font.load();
      document.fonts.add(font);

      this.preloadedResources.add(fontUrl);
      logger.debug('Font preloaded successfully', { fontUrl, fontFamily });
    } catch (error) {
      logger.error('Font preload failed', error);
      throw error;
    }
  }

  /**
   * 批量预加载资源
   */
  async preloadResources(resources: {
    modules?: string[];
    images?: string[];
    css?: string[];
    fonts?: Array<{ url: string; family: string }>;
  }): Promise<void> {
    const promises: Promise<any>[] = [];

    // 预加载模块
    if (resources.modules) {
      promises.push(...resources.modules.map(module =>
        this.preloadModule(module).catch(error =>
          logger.warn('Module preload failed', { module, error })
        )
      ));
    }

    // 预加载图片
    if (resources.images) {
      promises.push(...resources.images.map(image =>
        this.preloadImage(image).catch(error =>
          logger.warn('Image preload failed', { image, error })
        )
      ));
    }

    // 预加载CSS
    if (resources.css) {
      promises.push(...resources.css.map(css =>
        this.preloadCSS(css).catch(error =>
          logger.warn('CSS preload failed', { css, error })
        )
      ));
    }

    // 预加载字体
    if (resources.fonts) {
      promises.push(...resources.fonts.map(font =>
        this.preloadFont(font.url, font.family).catch(error =>
          logger.warn('Font preload failed', { font, error })
        )
      ));
    }

    await Promise.allSettled(promises);
  }

  /**
   * 检查资源是否已预加载
   */
  isPreloaded(resource: string): boolean {
    return this.preloadedResources.has(resource);
  }

  /**
   * 清除预加载缓存
   */
  clearCache(): void {
    this.preloadedResources.clear();
    this.preloadPromises.clear();
  }
}
