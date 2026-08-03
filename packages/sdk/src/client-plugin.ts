/**
 * Better Auth Client Plugin - 李代桃僵
 *
 * 作为 Better Auth 插件使用，初始化时自动将所有 Controller 替换为 HTTP 代理。
 * 用户既可以通过 Better Auth 风格调用，也可以通过 DI 获取 Controller。
 *
 * @example
 * ```typescript
 * import { createAuthClient } from 'better-auth/client'
 * import { createSkerClientPlugin, WorkflowController } from '@sker/sdk'
 * import { root } from '@sker/core'
 *
 * // 创建带 Sker 插件的 Auth 客户端
 * const auth = createAuthClient({
 *   baseURL: 'http://localhost:8089',
 *   plugins: [createSkerClientPlugin()]
 * })
 *
 * // 方式1: Better Auth 风格
 * const list = await auth.sker.workflow.listWorkflows()
 *
 * // 方式2: DI 风格（李代桃僵后）
 * const workflow = root.get(WorkflowController)
 * const list = await workflow.listWorkflows()
 * ```
 */

import type { BetterAuthClientOptions, BetterAuthClientPlugin, BetterFetch, ClientStore } from 'better-auth/client';
import type { Provider, Type } from '@sker/core';
import { CONTROLLES, PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA, SSE_METADATA, RequestMethod, root } from '@sker/core';
import { Observable } from 'rxjs';
import { clone } from '@sker/workflow';
import { BETTER_FETCH, BETTER_OPTIONS, BETTER_STORE } from './tokens';
import { createPostSSEObservable } from './client-plugin-sse';
import { buildFullPath, extractParameters, replaceUrlParams, getHttpMethodString } from './client-plugin-utils';

/**
 * 创建 Sker 客户端插件
 *
 * 插件功能：
 * 1. 提供 Better Auth 风格的 API 调用（auth.sker.xxx）
 * 2. 自动执行李代桃僵，将 DI 中的 Controller 替换为 HTTP 代理
 */
export function createSkerClientPlugin(): BetterAuthClientPlugin {
  const controllers = root.get(CONTROLLES, []);

  return {
    id: 'sker',

    // 插件初始化时执行李代桃僵
    $InferServerPlugin: {} as any,

    getActions: ($fetch, $store, options) => {
      // 李代桃僵：将 Controller 替换为 HTTP 代理
      registerControllerProxies($fetch, $store, options);

      // 返回 Better Auth 风格的 actions
      return buildBetterAuthActions(controllers);
    },

    pathMethods: generatePathMethods(controllers),
  };
}

/**
 * 李代桃僵核心：注册 Controller 代理到 DI 容器
 */
function registerControllerProxies($fetch: BetterFetch, $store: ClientStore, options?: BetterAuthClientOptions): void {
  const controllers = root.get(CONTROLLES, []);
  const providers: Provider[] = [];

  // 注册 BETTER_FETCH 实例（供其他地方使用）
  providers.push({
    provide: BETTER_FETCH,
    useValue: $fetch,
  });

  providers.push({
    provide: BETTER_STORE,
    useValue: $store
  });

  providers.push({
    provide: BETTER_OPTIONS,
    useValue: options
  })

  // 为每个 Controller 创建代理 Provider
  for (const controllerClass of controllers) {
    providers.push({
      provide: controllerClass,
      useFactory: () => createControllerProxy(controllerClass),
    });
  }

  // 执行替换
  root.set(providers);
}

/**
 * 构建 Better Auth 风格的 actions
 */
function buildBetterAuthActions(
  controllers: Type<any>[],
): Record<string, any> {
  const actions: Record<string, any> = {};

  for (const controllerClass of controllers) {
    const controllerPrefix = Reflect.getMetadata(PATH_METADATA, controllerClass) || '';
    const controllerName = getControllerName(controllerPrefix);

    if (!actions[controllerName]) {
      actions[controllerName] = {};
    }

    const methodNames = getMethodNames(controllerClass);

    for (const methodName of methodNames) {
      const originalMethod = controllerClass.prototype[methodName];
      const methodPath = Reflect.getMetadata(PATH_METADATA, originalMethod) || '/';
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, originalMethod);
      const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, originalMethod) || {};
      const isSse = Reflect.getMetadata(SSE_METADATA, originalMethod) === true;

      if (httpMethod === undefined) continue;

      actions[controllerName][methodName] = createMethodProxy(
        controllerPrefix,
        methodPath,
        httpMethod,
        routeArgs,
        isSse
      );
    }
  }

  return actions;
}

/**
 * 为单个 Controller 创建代理对象
 *
 * 代理方法在调用时通过 root.get(BETTER_FETCH) 读取 $fetch，
 * 因此这里无需接收 $fetch 参数。
 */
function createControllerProxy<T>(
  controllerClass: Type<T>,
): T {
  const controllerPrefix = Reflect.getMetadata(PATH_METADATA, controllerClass) || '';
  const methodNames = getMethodNames(controllerClass);

  const proxy: any = {};

  for (const methodName of methodNames) {
    const originalMethod = controllerClass.prototype[methodName];
    const methodPath = Reflect.getMetadata(PATH_METADATA, originalMethod) || '/';
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, originalMethod);
    const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, originalMethod) || {};
    const isSse = Reflect.getMetadata(SSE_METADATA, originalMethod) === true;

    if (httpMethod === undefined) continue;

    proxy[methodName] = createMethodProxy(
      controllerPrefix,
      methodPath,
      httpMethod,
      routeArgs,
      isSse
    );
  }

  return proxy as T;
}

/**
 * 创建方法代理
 */
function createMethodProxy(
  controllerPrefix: string,
  methodPath: string,
  httpMethod: RequestMethod,
  routeArgs: Record<string, any>,
  isSse: boolean
): (...args: any[]) => any {
  if (isSse) {
    return (...args: any[]) => {
      const fullPath = buildFullPath(controllerPrefix, methodPath);
      const { urlParams, queryParams, bodyData } = extractParameters(args, routeArgs);
      const finalUrl = replaceUrlParams(fullPath, urlParams);
      return createPostSSEObservable(finalUrl, queryParams, bodyData);
    };
  }

  return async (...args: any[]) => {
    const fullPath = buildFullPath(controllerPrefix, methodPath);
    const { urlParams, queryParams, bodyData } = extractParameters(args, routeArgs);
    const finalUrl = replaceUrlParams(fullPath, urlParams);

    // 检测 FormData，不进行 clone 和 JSON 序列化
    const isFormData = bodyData instanceof FormData;
    const requestBody = isFormData ? bodyData : (bodyData ? clone(bodyData) : undefined);

    const $fetch = root.get(BETTER_FETCH)
    const { data, error } = await $fetch(finalUrl, {
      method: getHttpMethodString(httpMethod),
      query: queryParams,
      body: requestBody,
      throw: false,
    });

    if (error) {
      throw new Error(`API error: ${error.message || JSON.stringify(error)}`);
    }

    // 适配后端 API 响应格式
    if (data && typeof data === 'object' && 'success' in data) {
      const apiResponse = data as { success: boolean; data?: any };
      if (apiResponse.success) {
        return apiResponse.data;
      }
      throw new Error(`API error: ${JSON.stringify(data)}`);
    }

    return data;
  };
}

/**
 * 生成路径到 HTTP 方法的映射
 */
function generatePathMethods(controllers: any[]): Record<string, 'GET' | 'POST'> {
  const pathMethods: Record<string, 'GET' | 'POST'> = {};

  for (const controllerClass of controllers) {
    const controllerPrefix = Reflect.getMetadata(PATH_METADATA, controllerClass) || '';
    const methodNames = getMethodNames(controllerClass);

    for (const methodName of methodNames) {
      const originalMethod = controllerClass.prototype[methodName];
      const methodPath = Reflect.getMetadata(PATH_METADATA, originalMethod) || '/';
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, originalMethod);
      const isSse = Reflect.getMetadata(SSE_METADATA, originalMethod) === true;

      if (httpMethod !== undefined && !isSse) {
        const fullPath = buildFullPath(controllerPrefix, methodPath);
        pathMethods[fullPath] = httpMethod === RequestMethod.GET ? 'GET' : 'POST';
      }
    }
  }

  return pathMethods;
}

/**
 * 获取类上的方法名列表
 */
function getMethodNames(controllerClass: Type<any>): string[] {
  return Object.getOwnPropertyNames(controllerClass.prototype).filter(
    name => name !== 'constructor'
  );
}

/**
 * 从控制器路径提取名称
 */
function getControllerName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'default';
}
