/**
 * 图片懒加载观察器
 */

import { createLogger } from '../logger';

const logger = createLogger('LoadingOptimization');

/**
 * 图片懒加载观察器
 */
export class ImageLazyLoader {
  private static instance: ImageLazyLoader;
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();

  static getInstance(): ImageLazyLoader {
    if (!ImageLazyLoader.instance) {
      ImageLazyLoader.instance = new ImageLazyLoader();
    }
    return ImageLazyLoader.instance;
  }

  constructor() {
    this.initObserver();
  }

  private initObserver(): void {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadImage(entry.target as HTMLImageElement);
              this.observer?.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px', // 提前50px开始加载
          threshold: 0.1,
        }
      );
    }
  }

  /**
   * 观察图片元素
   */
  observe(img: HTMLImageElement): void {
    if (this.observer && !this.loadedImages.has(img.dataset.src || '')) {
      this.observer.observe(img);
    }
  }

  /**
   * 加载图片
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset['src']!;
    if (src && !this.loadedImages.has(src)) {
      img.src = src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
      this.loadedImages.add(src);

      logger.debug('Image loaded lazily', { src });
    }
  }

  /**
   * 取消观察
   */
  unobserve(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.unobserve(img);
    }
  }

  /**
   * 断开观察器
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
