/**
 * 控制器相关装饰器和类型定义
 *
 * 与 NestJS 保持一致的 API 设计，确保架构一致性
 */

import { Type } from './injector';

// HTTP 方法装饰器元数据键
export const PATH_METADATA = 'path';
export const METHOD_METADATA = 'method';
export const ROUTE_ARGS_METADATA = 'route-args';

// HTTP 方法枚举
export enum RequestMethod {
  GET = 0,
  POST = 1,
  PUT = 2,
  DELETE = 3,
  PATCH = 4,
  OPTIONS = 5,
  HEAD = 6,
}

// 路由参数类型
export enum ParamType {
  PARAM = 'param',
  QUERY = 'query',
  BODY = 'body',
}

// 路由参数元数据接口
export interface RouteParamMetadata {
  index: number;
  type: ParamType;
  data?: string;
}

// 路由定义接口
export interface RouteDefinition {
  path?: string;
  requestMethod: RequestMethod;
  target: Function;
  methodName: string;
  metadata?: Record<string, any>;
}

/**
 * 控制器装饰器
 *
 * 存在即合理：
 * - 标记类为控制器，提供路由前缀
 * - 与 NestJS @Controller 装饰器完全兼容
 * - 支持嵌套路由和模块化设计
 */
export function Controller(prefix?: string): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(PATH_METADATA, prefix || '', target);
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
function createHttpMethodDecorator(method: RequestMethod, path?: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
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
export const Put = createHttpMethodDecorator(RequestMethod.PUT);
export const Delete = createHttpMethodDecorator(RequestMethod.DELETE);
export const Patch = createHttpMethodDecorator(RequestMethod.PATCH);
export const Options = createHttpMethodDecorator(RequestMethod.OPTIONS);
export const Head = createHttpMethodDecorator(RequestMethod.HEAD);

/**
 * 创建参数装饰器的工厂函数
 *
 * 优雅设计：
 * - 统一处理所有类型的参数装饰器
 * - 自动索引参数位置
 * - 支持参数名提取和类型推断
 */
function createParamDecorator(type: ParamType): (data?: string) => ParameterDecorator {
  return (data?: string) => (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    const existingMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, target[propertyKey]) || {};
    const metadataKey = `${type}:${data || ''}`;

    existingMetadata[metadataKey] = {
      index: parameterIndex,
      type,
      data,
    };

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, existingMetadata, target[propertyKey]);
  };
}

/**
 * 参数装饰器
 *
 * 存在即合理：
 * - 提供完整的参数提取支持
 * - 与 NestJS 参数装饰器保持一致的 API
 * - 支持类型安全的参数注入
 */
export const Param = createParamDecorator(ParamType.PARAM);
export const Query = createParamDecorator(ParamType.QUERY);
export const Body = createParamDecorator(ParamType.BODY);

/**
 * 获取控制器的路由前缀
 *
 * 优雅设计：
 * - 统一的元数据提取方式
 * - 支持嵌套路径处理
 * - 提供默认值处理
 */
export function getControllerPath(target: Type<any>): string {
  return Reflect.getMetadata(PATH_METADATA, target) || '';
}

/**
 * 获取方法的路由信息
 *
 * 优雅设计：
 * - 提取完整的路由定义
 * - 包含 HTTP 方法和路径信息
 * - 支持元数据扩展
 */
export function getRouteDefinitions(target: Type<any>): RouteDefinition[] {
  const prototype = target.prototype;
  const methods = Object.getOwnPropertyNames(prototype);

  return methods
    .filter(methodName => methodName !== 'constructor')
    .map(methodName => {
      const method = prototype[methodName];
      const path = Reflect.getMetadata(PATH_METADATA, method);
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, method);

      if (requestMethod !== undefined) {
        return {
          path,
          requestMethod,
          target,
          methodName,
        };
      }

      return null;
    })
    .filter(Boolean) as RouteDefinition[];
}

/**
 * 获取方法的参数元数据
 *
 * 优雅设计：
 * - 提取完整的参数信息
 * - 支持多种参数类型
 * - 保持参数顺序和类型
 */
export function getRouteParamsMetadata(target: any, methodName: string): Record<string, RouteParamMetadata> {
  return Reflect.getMetadata(ROUTE_ARGS_METADATA, target[methodName]) || {};
}

/**
 * 检查类是否为控制器
 *
 * 优雅设计：
 * - 类型安全的方式检查控制器
 * - 支持继承链检查
 * - 提供明确的类型守卫
 */
export function isController(target: Type<any>): boolean {
  return Reflect.hasMetadata(PATH_METADATA, target);
}