import { root } from '@sker/core';
import { AUTH_RATE_LIMIT } from '../core/tokens';
import { resolveConstructor } from '../core/utils';
import type { RateLimitOptions } from '../core/types';

/**
 * @RateLimit 装饰器
 * 为端点或整个插件配置限流
 * 可应用于类级别（全局）或方法级别（单个端点）
 */
export function RateLimit(options: RateLimitOptions): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    const ctor = resolveConstructor(typeof target === 'function' ? target : target.constructor);

    root.set([{
      provide: AUTH_RATE_LIMIT,
      multi: true,
      useValue: {
        target: ctor,
        propertyKey,
        ...options
      }
    }]);

    return descriptor;
  };
}
