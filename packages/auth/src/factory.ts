import 'reflect-metadata';
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import type { Endpoint } from 'better-auth';
import {
  PATH_METADATA,
  METHOD_METADATA,
  ROUTE_ARGS_METADATA,
  MIDDLEWARE_METADATA,
  RESPONSE_SCHEMA_METADATA,
  OPENAPI_DESCRIPTION_METADATA,
  OPENAPI_TAGS_METADATA,
  ParamType,
  RequestMethod,
  root,
} from '@sker/core';
import { permissionMiddleware } from './permission';
import { zodToOpenAPI } from './zod-to-openapi';
import { z } from 'zod';

interface RouteParameter {
  type: ParamType;
  key?: string;
  zod?: z.ZodTypeAny;
  index: number;
}

interface MiddlewareMetadata {
  permissions?: Record<string, unknown>;
}

interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  schema: unknown;
}

interface EndpointConfig {
  method: string;
  use: unknown[];
  metadata: {
    openapi: {
      description: string;
      tags: string[];
      requestBody?: {
        content: {
          'application/json': {
            schema: unknown;
          };
        };
      };
      responses?: Record<number, {
        description: string;
        content: {
          'application/json': {
            schema: unknown;
          };
        };
      }>;
      parameters?: OpenAPIParameter[];
    };
  };
  body?: unknown;
  query?: unknown;
}

interface RequestContext {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: Headers;
  context: {
    session: unknown;
  };
  json: (data: unknown) => Response;
}

type ControllerConstructor = new (...args: unknown[]) => unknown;

export function controllerFactory(ControllerClass: ControllerConstructor): Record<string, Endpoint> {
  const controllerPath = Reflect.getMetadata(PATH_METADATA, ControllerClass) || '';
  const endpoints: Record<string, Endpoint> = {};

  // 获取所有方法（从实现类）
  const proto = ControllerClass.prototype;
  const methodNames = Object.getOwnPropertyNames(proto).filter(name => name !== 'constructor');

  // 但元数据从基类原型读取（如果有基类）
  const protoForMetadata = proto;

  for (const methodName of methodNames) {
    const method = protoForMetadata[methodName]; // 从基类原型读取元数据
    const routePath = Reflect.getMetadata(PATH_METADATA, method);

    if (!routePath) {
      console.log(`[Controller Bridge] Skipping method ${methodName} (no route metadata)`);
      continue; // 跳过没有路由装饰器的方法
    }

    const fullPath = `${controllerPath}${routePath}`;
    const httpMethod = getHttpMethod(Reflect.getMetadata(METHOD_METADATA, method));
    const middlewareMeta = Reflect.getMetadata(MIDDLEWARE_METADATA, method) as MiddlewareMetadata | undefined;
    const responseSchema = Reflect.getMetadata(RESPONSE_SCHEMA_METADATA, method) as z.ZodTypeAny | undefined;
    const argsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, method) as Record<string, RouteParameter> || {};
    const description = Reflect.getMetadata(OPENAPI_DESCRIPTION_METADATA, method) as string | undefined;
    const tags = Reflect.getMetadata(OPENAPI_TAGS_METADATA, method) as string[] | undefined;

    const bodyParams = Object.values(argsMetadata).filter(m => m.type === ParamType.BODY);
    const queryParams = Object.values(argsMetadata).filter(m => m.type === ParamType.QUERY);
    const pathParams = Object.values(argsMetadata).filter(m => m.type === ParamType.PARAM);
    const headerParams = Object.values(argsMetadata).filter(m => m.type === ParamType.HEADER);

    const middleware: unknown[] = [];
    if (middlewareMeta?.permissions) {
      middleware.push(sessionMiddleware);
      middleware.push(permissionMiddleware(middlewareMeta.permissions));
    }

    const endpointConfig: EndpointConfig = {
      method: httpMethod as any,
      use: middleware,
      metadata: {
        openapi: {
          description: description || '',
          tags: tags || [],
        },
      },
    };

    // 添加 body schema（如果有）
    if (bodyParams.length > 0) {
      const firstBodyParam = bodyParams[0];
      if (bodyParams.length === 1 && !firstBodyParam?.key && firstBodyParam?.zod) {
        endpointConfig.body = firstBodyParam.zod;
        const openApiSchema = zodToOpenAPI(firstBodyParam.zod);
        endpointConfig.metadata.openapi.requestBody = {
          content: {
            'application/json': {
              schema: openApiSchema,
            },
          },
        };
      } else {
        // 多个 @Body('key') 装饰器，合并为一个 object schema
        const bodySchema: Record<string, z.ZodTypeAny> = {};
        bodyParams.forEach(param => {
          if (param.key && param.zod) {
            bodySchema[param.key] = param.zod;
          }
        });

        if (Object.keys(bodySchema).length > 0) {
          endpointConfig.body = bodySchema;
          // 构建合并的 OpenAPI schema
          const mergedZodSchema = z.object(bodySchema);
          const openApiSchema = zodToOpenAPI(mergedZodSchema);
          endpointConfig.metadata.openapi.requestBody = {
            content: {
              'application/json': {
                schema: openApiSchema,
              },
            },
          };
        }
      }
    }

    // 添加 response schema（如果有）
    if (responseSchema) {
      endpointConfig.metadata.openapi.responses = {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: zodToOpenAPI(responseSchema),
            },
          },
        },
      };
    }

    // 添加 query schema（如果有）
    if (queryParams.length > 0) {
      const firstQueryParam = queryParams[0];
      if (queryParams.length === 1 && !firstQueryParam?.key && firstQueryParam?.zod) {
        endpointConfig.query = firstQueryParam.zod;

        const querySchema = zodToOpenAPI(firstQueryParam.zod);
        if (querySchema.properties) {
          endpointConfig.metadata.openapi.parameters = Object.keys(querySchema.properties).map(key => ({
            name: key,
            in: 'query' as const,
            required: querySchema.required?.includes(key) || false,
            schema: querySchema.properties?.[key]
          }));
        }
      } else {
        // 多个 @Query('key') 装饰器，构建 object schema
        const querySchema: Record<string, z.ZodTypeAny> = {};
        const openapiParameters: OpenAPIParameter[] = [];

        queryParams.forEach(param => {
          if (param.key && param.zod) {
            querySchema[param.key] = param.zod;

            // 添加到 OpenAPI parameters
            openapiParameters.push({
              name: param.key,
              in: 'query' as const,
              required: !param.zod?.isOptional?.() || false,
              schema: zodToOpenAPI(param.zod)
            });
          }
        });

        if (Object.keys(querySchema).length > 0) {
          endpointConfig.query = querySchema;
          endpointConfig.metadata.openapi.parameters = openapiParameters;
        }
      }
    }

    // 添加 path 参数到 OpenAPI（如果有）
    if (pathParams.length > 0) {
      const pathParameters: OpenAPIParameter[] = [];
      pathParams.forEach(param => {
        if (param.key && param.zod) {
          pathParameters.push({
            name: param.key,
            in: 'path' as const,
            required: true,
            schema: zodToOpenAPI(param.zod)
          });
        }
      });

      if (pathParameters.length > 0) {
        if (!endpointConfig.metadata.openapi.parameters) {
          endpointConfig.metadata.openapi.parameters = [] as OpenAPIParameter[];
        }
        endpointConfig.metadata.openapi.parameters.push(...pathParameters);
      }
    }

    // 添加 header 参数到 OpenAPI（如果有）
    if (headerParams.length > 0) {
      const headerParameters: OpenAPIParameter[] = [];
      headerParams.forEach(param => {
        if (param.key && param.zod) {
          headerParameters.push({
            name: param.key,
            in: 'header' as const,
            required: !param.zod?.isOptional?.() || false,
            schema: zodToOpenAPI(param.zod)
          });
        }
      });

      if (headerParameters.length > 0) {
        if (!endpointConfig.metadata.openapi.parameters) {
          endpointConfig.metadata.openapi.parameters = [] as OpenAPIParameter[];
        }
        endpointConfig.metadata.openapi.parameters.push(...headerParameters);
      }
    }

    const endpoint = createAuthEndpoint(
      fullPath,
      endpointConfig as never,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (ctx: any) => {
        const instance = root.get(ControllerClass);
        const args = injectParameters(argsMetadata, ctx);
        const method = Reflect.get(instance as object, methodName);
        if (typeof method !== 'function') {
          throw new Error(`Method ${methodName} is not a function`);
        }
        const result = await method.bind(instance)(...args);
        return ctx.json(result);
      }
    );
    const endpointKey = pathToCamelCase(fullPath);
    endpoints[endpointKey] = endpoint;
  }
  return endpoints;
}

/**
 * HTTP 方法枚举到字符串映射
 */
function getHttpMethod(methodEnum: RequestMethod): string {
  const map: Record<RequestMethod, string> = {
    [RequestMethod.GET]: 'GET',
    [RequestMethod.POST]: 'POST',
    [RequestMethod.PUT]: 'PUT',
    [RequestMethod.DELETE]: 'DELETE',
    [RequestMethod.PATCH]: 'PATCH',
    [RequestMethod.SSE]: 'GET',
  };
  return map[methodEnum] || 'GET';
}

/**
 * 将路径转换为驼峰命名
 *
 * 存在即合理：
 * - endpoint key 应反映实际路由路径，而非控制器名称
 * - 自动过滤路径参数（:id等）
 * - /loomart/activity/get => loomartActivityGet
 * - /loomart/activities/list => loomartActivitiesList
 * - /loomart/activity/:id/update => loomartActivityUpdate
 */
function pathToCamelCase(path: string): string {
  return path
    .split('/')
    .filter(segment => segment && !segment.startsWith(':'))
    .map((segment, index) =>
      index === 0
        ? segment
        : segment.charAt(0).toUpperCase() + segment.slice(1)
    )
    .join('');
}

/**
 * 参数注入逻辑
 *
 * 优雅即简约：
 * - 直接映射请求数据到方法参数
 * - 支持所有参数类型（Body, Session, Query, Param, Header）
 * - 注意：不处理 Adapter 等服务依赖，它们已通过 DI 注入到 Controller 构造函数
 *
 * 支持的装饰器用法：
 * - @Body(schema) - 整个请求体
 * - @Body('field', schema) - 请求体中的特定字段（支持多个）
 * - @Query() - 整个 query 对象
 * - @Query('key', schema) - query 中的特定参数（支持多个）
 * - @Param('id', schema) - 路径参数（支持多个，自动添加到 OpenAPI path parameters）
 * - @Header('authorization', schema) - 请求头（支持多个，自动添加到 OpenAPI header parameters）
 * - @Session() - 当前会话
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectParameters(argsMetadata: Record<string, RouteParameter>, ctx: any): unknown[] {
  const sortedMetadata = Object.values(argsMetadata).sort(
    (a, b) => a.index - b.index
  );

  return sortedMetadata.map(metadata => {
    const { type, key: fieldKey, zod } = metadata;
    const context = ctx as RequestContext;

    switch (type) {
      case ParamType.BODY:
        const bodyValue = fieldKey ? (context.body as Record<string, unknown>)[fieldKey] : context.body;
        return zod ? zod.parse(bodyValue) : bodyValue;

      case ParamType.SESSION:
        return context.context.session;

      case ParamType.QUERY:
        return fieldKey ? (context.query as Record<string, unknown>)[fieldKey] : context.query;

      case ParamType.PARAM:
        return fieldKey ? (context.params as Record<string, unknown>)[fieldKey] : context.params;

      case ParamType.HEADER:
        return fieldKey ? context.headers.get(fieldKey) : context.headers;

      default:
        return undefined;
    }
  });
}
