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
 *   baseURL: 'http://localhost:3000',
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

import type { BetterAuthClientPlugin } from 'better-auth/client';
import type { Provider, Type } from '@sker/core';
import { CONTROLLES, PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA, RequestMethod, ParamType, root } from '@sker/core';
import { Observable } from 'rxjs';
import { clone } from '@sker/workflow';
import { BETTER_FETCH } from './tokens';

type FetchFunction = (url: string, options?: any) => Promise<{ data: any; error: any }>;

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

    getActions: ($fetch) => {
      // 李代桃僵：将 Controller 替换为 HTTP 代理
      registerControllerProxies($fetch);

      // 返回 Better Auth 风格的 actions
      return buildBetterAuthActions(controllers, $fetch);
    },

    pathMethods: generatePathMethods(controllers),
  };
}

/**
 * 李代桃僵核心：注册 Controller 代理到 DI 容器
 */
function registerControllerProxies($fetch: FetchFunction): void {
  const controllers = root.get(CONTROLLES, []);
  const providers: Provider[] = [];

  // 注册 BETTER_FETCH 实例（供其他地方使用）
  providers.push({
    provide: BETTER_FETCH,
    useValue: $fetch,
  });

  // 为每个 Controller 创建代理 Provider
  for (const controllerClass of controllers) {
    providers.push({
      provide: controllerClass,
      useFactory: () => createControllerProxy(controllerClass, $fetch),
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
  $fetch: FetchFunction
): Record<string, any> {
  const actions: Record<string, any> = {};

  for (const controllerClass of controllers) {
    const controllerPrefix = Reflect.getMetadata(PATH_METADATA, controllerClass) || '';
    const controllerName = getControllerName(controllerPrefix);

    if (!actions[controllerName]) {
      actions[controllerName] = {};
    }

    const methodNames = Object.getOwnPropertyNames(controllerClass.prototype).filter(
      name => name !== 'constructor'
    );

    for (const methodName of methodNames) {
      const originalMethod = controllerClass.prototype[methodName];
      const methodPath = Reflect.getMetadata(PATH_METADATA, originalMethod) || '/';
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, originalMethod);
      const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, originalMethod) || {};

      if (httpMethod === undefined) continue;

      actions[controllerName][methodName] = createMethodProxy(
        controllerPrefix,
        methodPath,
        httpMethod,
        routeArgs,
        $fetch
      );
    }
  }

  return actions;
}

/**
 * 为单个 Controller 创建代理对象
 */
function createControllerProxy<T>(
  controllerClass: Type<T>,
  $fetch: FetchFunction
): T {
  const controllerPrefix = Reflect.getMetadata(PATH_METADATA, controllerClass) || '';
  const methodNames = Object.getOwnPropertyNames(controllerClass.prototype).filter(
    name => name !== 'constructor'
  );

  const proxy: any = {};

  for (const methodName of methodNames) {
    const originalMethod = controllerClass.prototype[methodName];
    const methodPath = Reflect.getMetadata(PATH_METADATA, originalMethod) || '/';
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, originalMethod);
    const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, originalMethod) || {};

    if (httpMethod === undefined) continue;

    proxy[methodName] = createMethodProxy(
      controllerPrefix,
      methodPath,
      httpMethod,
      routeArgs,
      $fetch
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
  $fetch: FetchFunction
): (...args: any[]) => any {
  if (httpMethod === RequestMethod.SSE) {
    return (...args: any[]) => {
      const fullPath = buildFullPath(controllerPrefix, methodPath);
      const { urlParams, queryParams, bodyData } = extractParameters(args, routeArgs);
      const finalUrl = replaceUrlParams(fullPath, urlParams);

      if (bodyData !== undefined) {
        return createPostSSEObservable(finalUrl, bodyData);
      } else {
        return createGetSSEObservable(finalUrl, queryParams);
      }
    };
  }

  return async (...args: any[]) => {
    const fullPath = buildFullPath(controllerPrefix, methodPath);
    const { urlParams, queryParams, bodyData, headers } = extractParameters(args, routeArgs);
    const finalUrl = replaceUrlParams(fullPath, urlParams);

    // 检测 FormData，不进行 clone 和 JSON 序列化
    const isFormData = bodyData instanceof FormData;
    const requestBody = isFormData ? bodyData : (bodyData ? clone(bodyData) : undefined);

    // FormData 不设置 Content-Type，让浏览器自动设置 multipart/form-data boundary
    const requestHeaders = isFormData ? {} : headers;

    const { data, error } = await $fetch(finalUrl, {
      method: getHttpMethodString(httpMethod),
      query: queryParams,
      body: requestBody,
      headers: requestHeaders,
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
    const methodNames = Object.getOwnPropertyNames(controllerClass.prototype).filter(
      name => name !== 'constructor'
    );

    for (const methodName of methodNames) {
      const originalMethod = controllerClass.prototype[methodName];
      const methodPath = Reflect.getMetadata(PATH_METADATA, originalMethod) || '/';
      const httpMethod = Reflect.getMetadata(METHOD_METADATA, originalMethod);

      if (httpMethod !== undefined && httpMethod !== RequestMethod.SSE) {
        const fullPath = buildFullPath(controllerPrefix, methodPath);
        pathMethods[fullPath] = httpMethod === RequestMethod.GET ? 'GET' : 'POST';
      }
    }
  }

  return pathMethods;
}

/**
 * 从控制器路径提取名称
 */
function getControllerName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'default';
}

/**
 * 创建 POST SSE Observable
 */
function createPostSSEObservable<T>(url: string, bodyData: any): Observable<T> {
  return new Observable<T>(subscriber => {
    const abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(clone(bodyData)),
      signal: abortController.signal,
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        reader = response.body?.getReader() ?? null;
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        function read() {
          reader!.read().then(({ done, value }) => {
            if (done) {
              subscriber.complete();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine === '' || trimmedLine.startsWith(':')) continue;

              if (trimmedLine.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmedLine.slice(6));
                  subscriber.next(data);
                } catch (error) {
                  console.warn('[SSE] JSON 解析失败:', trimmedLine.slice(0, 100), error);
                }
              }
            }

            read();
          }).catch(error => {
            if (error.name === 'AbortError') {
              subscriber.complete();
            } else {
              bodyData.state = 'fail';
              subscriber.next({ ...bodyData } as T);
              subscriber.complete();
            }
          });
        }

        read();
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          subscriber.error(error);
        } else {
          subscriber.complete();
        }
      });

    return () => {
      abortController.abort();
      reader?.cancel().catch(() => {});
    };
  });
}

/**
 * 创建 GET SSE Observable
 */
function createGetSSEObservable<T>(url: string, queryParams: Record<string, any>): Observable<T> {
  const sseUrl = buildSSEUrl(url, queryParams);

  return new Observable<T>(subscriber => {
    if (typeof window === 'undefined' || !window.EventSource) {
      subscriber.error(new Error('EventSource is not available'));
      return;
    }

    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        subscriber.next(JSON.parse(event.data));
      } catch (error) {
        console.warn('[SSE] JSON 解析失败:', event.data?.slice(0, 100), error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] EventSource 错误:', error);
      subscriber.error(error);
    };

    return () => eventSource.close();
  });
}

// ============ 工具函数 ============

function buildFullPath(controllerPrefix: string, methodPath: string): string {
  if (!controllerPrefix) return methodPath;
  if (!methodPath || methodPath === '/') return controllerPrefix;

  const normalizedPrefix = controllerPrefix.startsWith('/') ? controllerPrefix : `/${controllerPrefix}`;
  const normalizedPath = methodPath.startsWith('/') ? methodPath : `/${methodPath}`;

  return `${normalizedPrefix}${normalizedPath}`;
}

function extractParameters(args: any[], routeArgs: Record<string, any>) {
  const urlParams: Record<string, any> = {};
  const queryParams: Record<string, any> = {};
  let bodyData: any = undefined;
  const headers: Record<string, any> = {};

  for (const [, metadata] of Object.entries(routeArgs)) {
    const { index, type, key: paramKey } = metadata;
    const value = args[index];

    if (value === undefined) continue;

    switch (type) {
      case ParamType.PARAM:
        if (paramKey) urlParams[paramKey] = value;
        break;
      case ParamType.QUERY:
        if (paramKey) queryParams[paramKey] = value;
        else Object.assign(queryParams, value);
        break;
      case ParamType.BODY:
        if (paramKey) {
          bodyData = bodyData || {};
          bodyData[paramKey] = value;
        } else {
          bodyData = value;
        }
        break;
      case ParamType.HEADER:
        if (paramKey) headers[paramKey] = value;
        break;
    }
  }

  return { urlParams, queryParams, bodyData, headers };
}

function replaceUrlParams(url: string, params: Record<string, any>): string {
  return url.replace(/:([^\/]+)/g, (match, paramName) => {
    return params[paramName] !== undefined ? String(params[paramName]) : match;
  });
}

function getHttpMethodString(method: RequestMethod): string {
  const map: Record<RequestMethod, string> = {
    [RequestMethod.GET]: 'GET',
    [RequestMethod.POST]: 'POST',
    [RequestMethod.PUT]: 'PUT',
    [RequestMethod.DELETE]: 'DELETE',
    [RequestMethod.PATCH]: 'PATCH',
    [RequestMethod.SSE]: 'GET',
  };
  return map[method] || 'GET';
}

function buildSSEUrl(baseUrl: string, queryParams: Record<string, any>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
