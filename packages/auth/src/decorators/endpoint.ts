import { root } from '@sker/core';
import { AUTH_ENDPOINT } from '../core/tokens';
import { resolveConstructor } from '../core/utils';
import type { EndpointOptions, HttpMethod } from '../core/types';

/**
 * 创建 HTTP 方法装饰器的工厂函数
 */
function createHttpMethodDecorator(method: HttpMethod) {
  return (path: string, options?: EndpointOptions): MethodDecorator => {
    return (target, propertyKey, descriptor) => {
      const ctor = resolveConstructor(target);

      root.set([{
        provide: AUTH_ENDPOINT,
        multi: true,
        useValue: {
          target: ctor,
          propertyKey,
          method,
          path,
          ...options
        }
      }]);

      return descriptor;
    };
  };
}

/**
 * @Get 装饰器 - GET 请求
 */
export const Get = createHttpMethodDecorator('GET');

/**
 * @Post 装饰器 - POST 请求
 */
export const Post = createHttpMethodDecorator('POST');

/**
 * @Put 装饰器 - PUT 请求
 */
export const Put = createHttpMethodDecorator('PUT');

/**
 * @Delete 装饰器 - DELETE 请求
 */
export const Delete = createHttpMethodDecorator('DELETE');
