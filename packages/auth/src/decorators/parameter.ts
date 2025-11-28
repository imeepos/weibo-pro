import { root } from '@sker/core';
import { AUTH_PARAMETER } from '../core/tokens';
import type { ParameterType } from '../core/types';

/**
 * 创建参数装饰器的工厂函数
 * 参考 @sker/core 的 @Inject 参数装饰器模式
 */
function createParameterDecorator(type: ParameterType, extraOptions?: any) {
  return (schemaOrName?: any): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      root.set([{
        provide: AUTH_PARAMETER,
        multi: true,
        useValue: {
          target: target.constructor,
          propertyKey,
          parameterIndex,
          type,
          ...(type === 'body' && { schema: schemaOrName }),
          ...(type === 'param' && { paramName: schemaOrName }),
          ...extraOptions
        }
      }]);
    };
  };
}

/**
 * @Body 装饰器 - 注入请求体
 * 支持 Zod schema 验证
 */
export const Body = createParameterDecorator('body');

/**
 * @Context 装饰器 - 注入 Better Auth 上下文
 */
export const Context = (): ParameterDecorator => createParameterDecorator('context')();

/**
 * @Query 装饰器 - 注入查询参数
 */
export const Query = (): ParameterDecorator => createParameterDecorator('query')();

/**
 * @Param 装饰器 - 注入路径参数
 */
export const Param = (name: string): ParameterDecorator => createParameterDecorator('param')(name);
