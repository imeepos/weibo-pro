/**
 * SDK 客户端代理
 *
 * 将 Controller 类自动转换为 HTTP 客户端代理，保持与后端 API 的一致性
 */

import { HttpClient, createHttpClient, type HttpClientConfig } from './http-client';
import {
  Controller,
  getControllerPath,
  getRouteDefinitions,
  getRouteParamsMetadata,
  type RouteDefinition,
  type RouteParamMetadata,
  ParamType,
  RequestMethod,
} from './controller';
import { Type } from './injector';

/**
 * SDK 客户端配置接口
 *
 * 优雅设计：
 * - 继承 HTTP 客户端配置
 * - 添加 SDK 特定配置
 * - 支持控制器特定的设置
 */
export interface SdkClientConfig extends HttpClientConfig {
  /**
   * 全局路径前缀
   */
  apiPrefix?: string;

  /**
   * 是否启用请求/响应日志
   */
  enableLogging?: boolean;

  /**
   * 错误处理策略
   */
  errorHandling?: 'throw' | 'return';
}

/**
 * 参数解析器接口
 *
 * 优雅设计：
 * - 支持多种参数类型解析
 * - 可扩展的解析策略
 * - 类型安全的参数处理
 */
export interface ParamResolver {
  resolve(metadata: RouteParamMetadata, args: any[]): any;
}

/**
 * 默认参数解析器
 *
 * 存在即合理：
 * - 处理 URL 参数、查询参数和请求体
 * - 提供默认的参数解析逻辑
 * - 支持复杂对象和简单类型
 */
export class DefaultParamResolver implements ParamResolver {
  resolve(metadata: RouteParamMetadata, args: any[]): any {
    const { index, type, data } = metadata;
    const value = args[index];

    switch (type) {
      case ParamType.PARAM:
        return data ? { [data]: value } : value;

      case ParamType.QUERY:
        return data ? { [data]: value } : value;

      case ParamType.BODY:
        return value;

      default:
        return value;
    }
  }
}

/**
 * SDK 客户端代理类
 *
 * 存在即合理：
 * - 自动将 Controller 类转换为 HTTP 客户端
 * - 保持与后端 API 的完全一致性
 * - 支持装饰器元数据的自动解析
 * - 提供类型安全的 API 调用
 */
export class SdkClient {
  private httpClient: HttpClient;
  private paramResolver: ParamResolver;
  private config: SdkClientConfig;

  constructor(config: SdkClientConfig = {}) {
    this.config = {
      apiPrefix: '/api',
      enableLogging: false,
      errorHandling: 'throw',
      ...config,
    };

    // 配置 HTTP 客户端
    const httpConfig: HttpClientConfig = {
      ...this.config,
    };

    // 添加日志拦截器
    if (this.config.enableLogging) {
      const { loggingInterceptor } = require('./http-client');
      httpConfig.interceptors = [loggingInterceptor];
    }

    this.httpClient = createHttpClient(httpConfig);
    this.paramResolver = new DefaultParamResolver();
  }

  /**
   * 创建控制器代理
   *
   * 优雅设计：
   - 使用 Proxy 实现动态方法调用
   - 自动解析装饰器元数据
   - 保持类型安全和方法签名
   */
  createControllerProxy<T>(ControllerClass: Type<T>): T {
    const controllerPath = getControllerPath(ControllerClass);
    const routes = getRouteDefinitions(ControllerClass);

    return new Proxy({}, {
      get: (_, method: string) => {
        const route = routes.find(r => r.methodName === method);

        if (!route) {
          throw new Error(`方法 ${method} 在控制器 ${ControllerClass.name} 中不存在`);
        }

        return async (...args: any[]) => {
          return this.executeRoute(route, controllerPath, args);
        };
      }
    }) as T;
  }

  /**
   * 执行路由调用
   *
   * 优雅设计：
   * - 根据路由定义构建 HTTP 请求
   * - 解析参数并处理不同的参数类型
   * - 统一的错误处理策略
   */
  private async executeRoute(route: RouteDefinition, controllerPath: string, args: any[]): Promise<any> {
    try {
      const { path, requestMethod, methodName } = route;
      const paramsMetadata = getRouteParamsMetadata(route.target, methodName);

      // 构建请求 URL
      const fullPath = this.buildPath(controllerPath, path, paramsMetadata, args);

      // 解析参数
      const { queryParams, body } = this.parseParameters(paramsMetadata, args);

      // 构建 HTTP 请求配置
      const requestConfig: any = {
        url: fullPath,
        method: this.getHttpMethod(requestMethod),
      };

      // 添加查询参数
      if (Object.keys(queryParams).length > 0) {
        requestConfig.params = queryParams;
      }

      // 添加请求体
      if (body !== undefined) {
        requestConfig.data = body;
      }

      // 执行请求
      const response = await this.httpClient.request(requestConfig);

      return response.data;

    } catch (error) {
      if (this.config.errorHandling === 'throw') {
        throw error;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 构建请求路径
   *
   * 优雅设计：
   * - 合并控制器路径和方法路径
   * - 添加 API 前缀
   * - 处理 URL 参数替换
   */
  private buildPath(
    controllerPath: string,
    methodPath: string,
    paramsMetadata: Record<string, RouteParamMetadata>,
    args: any[]
  ): string {
    let path = `${this.config.apiPrefix}${controllerPath}${methodPath}`;

    // 处理 URL 参数
    Object.entries(paramsMetadata).forEach(([key, metadata]) => {
      if (metadata.type === ParamType.PARAM && metadata.data) {
        const value = args[metadata.index];
        if (value !== undefined) {
          path = path.replace(`:${metadata.data}`, String(value));
        }
      }
    });

    return path;
  }

  /**
   * 解析方法参数
   *
   * 优雅设计：
   * - 分离查询参数和请求体
   * - 处理参数名称映射
   * - 合并多个参数为统一对象
   */
  private parseParameters(
    paramsMetadata: Record<string, RouteParamMetadata>,
    args: any[]
  ): { queryParams: Record<string, any>; body: any } {
    const queryParams: Record<string, any> = {};
    let body: any = undefined;

    Object.entries(paramsMetadata).forEach(([key, metadata]) => {
      const resolved = this.paramResolver.resolve(metadata, args);

      switch (metadata.type) {
        case ParamType.QUERY:
          if (typeof resolved === 'object' && resolved !== null) {
            Object.assign(queryParams, resolved);
          } else if (metadata.data) {
            queryParams[metadata.data] = resolved;
          }
          break;

        case ParamType.BODY:
          body = resolved;
          break;
      }
    });

    return { queryParams, body };
  }

  /**
   * 获取 HTTP 方法名称
   *
   * 优雅设计：
   * - 将枚举值转换为字符串
   * - 支持 GET、POST、PUT、DELETE 等
   */
  private getHttpMethod(method: RequestMethod): string {
    switch (method) {
      case RequestMethod.GET:
        return 'GET';
      case RequestMethod.POST:
        return 'POST';
      case RequestMethod.PUT:
        return 'PUT';
      case RequestMethod.DELETE:
        return 'DELETE';
      case RequestMethod.PATCH:
        return 'PATCH';
      case RequestMethod.OPTIONS:
        return 'OPTIONS';
      case RequestMethod.HEAD:
        return 'HEAD';
      default:
        return 'GET';
    }
  }

  /**
   * 获取底层 HTTP 客户端实例
   *
   * 优雅设计：
   * - 提供对底层客户端的访问
   * - 支持高级用例和自定义配置
   */
  getHttpClient(): HttpClient {
    return this.httpClient;
  }
}

/**
 * 创建 SDK 客户端的工厂函数
 *
 * 优雅设计：
   * - 简化客户端创建过程
   * - 提供默认配置
   * - 支持链式调用
 */
export function createSdkClient(config?: SdkClientConfig): SdkClient {
  return new SdkClient(config);
}

/**
 * 控制器装饰器工厂
 *
 * 优雅设计：
 * - 创建带有 SDK 代理的控制器
 * - 自动注入 HTTP 客户端
 * - 保持控制器类的纯净性
 */
export function createSdkController<T>(
  ControllerClass: Type<T>,
  config?: SdkClientConfig
): T {
  const client = createSdkClient(config);
  return client.createControllerProxy(ControllerClass);
}