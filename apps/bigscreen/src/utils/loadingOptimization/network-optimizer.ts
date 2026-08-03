/**
 * 网络连接优化
 */

import { createLogger } from '../logger';
import type { NetworkInformation } from './types';

const logger = createLogger('LoadingOptimization');

/**
 * 网络连接优化
 */
export class NetworkOptimizer {
  private static instance: NetworkOptimizer;
  private connectionType: string = 'unknown';
  private effectiveType: string = 'unknown';

  static getInstance(): NetworkOptimizer {
    if (!NetworkOptimizer.instance) {
      NetworkOptimizer.instance = new NetworkOptimizer();
    }
    return NetworkOptimizer.instance;
  }

  constructor() {
    this.detectConnection();
    this.setupConnectionListener();
  }

  /**
   * 检测网络连接
   */
  private detectConnection(): void {
    const connection = this.getConnection();
    if (!connection) {
      return;
    }

    this.connectionType = connection.type ?? 'unknown';
    this.effectiveType = connection.effectiveType ?? 'unknown';

    logger.debug('Network connection detected', {
      type: this.connectionType,
      effectiveType: this.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    });
  }

  /**
   * 监听连接变化
   */
  private setupConnectionListener(): void {
    const connection = this.getConnection();
    if (connection) {
      connection.addEventListener('change', () => {
        this.detectConnection();
        this.adjustOptimizations();
      });
    }
  }

  private getConnection(): NetworkInformation | null {
    if ('connection' in navigator) {
      const candidate = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      return candidate ?? null;
    }
    return null;
  }

  /**
   * 根据网络状况调整优化策略
   */
  private adjustOptimizations(): void {
    const isSlowConnection = this.effectiveType === 'slow-2g' || this.effectiveType === '2g';

    if (isSlowConnection) {
      logger.info('Slow connection detected, adjusting optimizations');
      // 可以触发一些优化策略
      this.enableDataSaver();
    } else {
      this.disableDataSaver();
    }
  }

  /**
   * 启用省流模式
   */
  private enableDataSaver(): void {
    document.documentElement.classList.add('data-saver');

    // 可以在CSS中定义.data-saver样式来减少动画、图片质量等
    logger.debug('Data saver mode enabled');
  }

  /**
   * 禁用省流模式
   */
  private disableDataSaver(): void {
    document.documentElement.classList.remove('data-saver');
    logger.debug('Data saver mode disabled');
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): {
    type: string;
    effectiveType: string;
    isSlowConnection: boolean;
  } {
    return {
      type: this.connectionType,
      effectiveType: this.effectiveType,
      isSlowConnection: this.effectiveType === 'slow-2g' || this.effectiveType === '2g',
    };
  }

  /**
   * 是否应该延迟加载
   */
  shouldDeferLoading(): boolean {
    return this.effectiveType === 'slow-2g' || this.effectiveType === '2g';
  }

  /**
   * 获取推荐的图片质量
   */
  getRecommendedImageQuality(): 'low' | 'medium' | 'high' {
    switch (this.effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'low';
      case '3g':
        return 'medium';
      default:
        return 'high';
    }
  }
}
