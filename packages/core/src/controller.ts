/**
 * 控制器相关装饰器和类型定义
 *
 * 与 NestJS 保持一致的 API 设计，确保架构一致性
 */

import { root } from './environment-injector';
import { InjectionToken } from './injection-token';
import { Type } from './injector';

// HTTP 方法装饰器元数据键
export const PATH_METADATA = 'path';
export const METHOD_METADATA = 'method';

// HTTP 方法枚举
export enum RequestMethod {
  GET = 0,
  POST = 1,
  PUT = 2,
  DELETE = 3,
  PATCH = 4,
  SSE = 5
}

/**
 * 控制器装饰器
 *
 * 存在即合理：
 * - 标记类为控制器，提供路由前缀
 * - 与 NestJS @Controller 装饰器完全兼容
 * - 支持嵌套路由和模块化设计
 */
export const CONTROLLES = new InjectionToken<Type<any>[]>(`CONTROLLES`)
export function Controller(prefix?: string): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(PATH_METADATA, prefix || '', target);
    root.set([
      { provide: CONTROLLES, multi: true, useValue: target }
    ]);
  };
}

/**
 * 创建 HTTP 方法装饰器的工厂函数
 *
 * 优雅设计：
 * - 统一创建所有 HTTP 方法装饰器
 * - 避免重复代码，确保一致性
 * - 支持路径参数和元数据注入
 */
function createHttpMethodDecorator(method: RequestMethod): (path?: string) => MethodDecorator {
  return (path?: string) => (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PATH_METADATA, path || '/', descriptor.value);
    Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value);
  };
}

/**
 * HTTP 方法装饰器
 *
 * 存在即合理：
 * - 提供完整的 HTTP 方法支持
 * - 与 NestJS 装饰器命名保持一致
 * - 支持路径参数定义
 */
export const Get = createHttpMethodDecorator(RequestMethod.GET);
export const Post = createHttpMethodDecorator(RequestMethod.POST);
export const Sse = createHttpMethodDecorator(RequestMethod.SSE);
export const Put = createHttpMethodDecorator(RequestMethod.PUT);
export const Delete = createHttpMethodDecorator(RequestMethod.DELETE);
export const Patch = createHttpMethodDecorator(RequestMethod.PATCH);

// 路由参数类型枚举
export enum ParamType {
  PARAM = 'param',
  QUERY = 'query',
  BODY = 'body',
  HEADER = 'header',
}

// 路由参数元数据键
export const ROUTE_ARGS_METADATA = 'route-args';

// 路由参数元数据接口
export interface RouteParamMetadata {
  index: number;
  type: ParamType;
  data?: string;
}

/**
 * 创建参数装饰器的工厂函数
 *
 * 优雅设计：
 * - 统一处理所有类型的参数装饰器
 * - 自动索引参数位置
 * - 支持参数名提取和类型推断
 */
function createParamDecorator(type: ParamType): (key?: string) => ParameterDecorator {
  return (key?: string) => (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) {
      throw new Error('参数装饰器只能用于方法参数');
    }

    // 定义方法元数据存储类型
    const methodTarget = target as Record<string | symbol, any>;
    const existingMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, methodTarget[propertyKey]) || {};
    const metadataKey = `${type}:${key || ''}`;

    existingMetadata[metadataKey] = {
      index: parameterIndex,
      type,
      key,
    };

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, existingMetadata, methodTarget[propertyKey]);
  };
}

/**
 * HTTP 参数装饰器
 *
 * 存在即合理：
 * - 为自定义 HTTP 框架提供参数提取能力
 * - 与 @sker/core 依赖注入系统集成
 * - 支持类型安全的参数注入
 */
export const Param = createParamDecorator(ParamType.PARAM);
export const Query = createParamDecorator(ParamType.QUERY);
export const Body = createParamDecorator(ParamType.BODY);
export const Header = createParamDecorator(ParamType.HEADER);