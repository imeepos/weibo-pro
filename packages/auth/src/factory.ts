import 'reflect-metadata';
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
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

export function controllerFactory(ControllerClass: any): Record<string, any> {
  // 获取基类（如果实现类通过 @Controller(BaseClass) 注册）

  // 从基类读取 path 和装饰器元数据，从实现类读取方法列表
  const controllerPath = Reflect.getMetadata(PATH_METADATA, ControllerClass) || '';

  const endpoints: Record<string, any> = {};

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
    const middlewareMeta = Reflect.getMetadata(MIDDLEWARE_METADATA, method);
    const responseSchema = Reflect.getMetadata(RESPONSE_SCHEMA_METADATA, method);
    const argsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, method) || {};
    const description = Reflect.getMetadata(OPENAPI_DESCRIPTION_METADATA, method);
    const tags = Reflect.getMetadata(OPENAPI_TAGS_METADATA, method);

    // 提取各类参数 schema
    const bodyParams = Object.values(argsMetadata).filter((m: any) => m.type === ParamType.BODY) as any[];
    const queryParams = Object.values(argsMetadata).filter((m: any) => m.type === ParamType.QUERY) as any[];
    const pathParams = Object.values(argsMetadata).filter((m: any) => m.type === ParamType.PARAM) as any[];
    const headerParams = Object.values(argsMetadata).filter((m: any) => m.type === ParamType.HEADER) as any[];

    // 构建中间件数组
    const middleware: any[] = [];
    if (middlewareMeta?.permissions) {
      middleware.push(sessionMiddleware);
      middleware.push(permissionMiddleware(middlewareMeta.permissions));
    }

    // 构建 endpoint 配置
    const endpointConfig: any = {
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
      if (bodyParams.length === 1 && !bodyParams[0].key) {
        // 单个 @Body() 装饰器，使用整个 body schema
        endpointConfig.body = bodyParams[0].zod;
        const openApiSchema = zodToOpenAPI(bodyParams[0].zod);
        endpointConfig.metadata.openapi.requestBody = {
          content: {
            'application/json': {
              schema: openApiSchema,
            },
          },
        };
      } else {
        // 多个 @Body('key') 装饰器，合并为一个 object schema
        const bodySchema: any = {};
        bodyParams.forEach((param: any) => {
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
      // 如果有多个 query 参数，合并为一个 object schema
      if (queryParams.length === 1 && !queryParams[0].key) {
        // 单个 @Query() 装饰器，使用整个 query 对象
        endpointConfig.query = queryParams[0].zod;

        // 添加到 OpenAPI metadata
        if (queryParams[0].zod) {
          const querySchema = zodToOpenAPI(queryParams[0].zod);
          if (querySchema.properties) {
            endpointConfig.metadata.openapi.parameters = Object.keys(querySchema.properties).map(key => ({
              name: key,
              in: 'query',
              required: querySchema.required?.includes(key) || false,
              schema: querySchema.properties[key]
            }));
          }
        }
      } else {
        // 多个 @Query('key') 装饰器，构建 object schema
        const querySchema: any = {};
        const openapiParameters: any[] = [];

        queryParams.forEach((param: any) => {
          if (param.key && param.zod) {
            querySchema[param.key] = param.zod;

            // 添加到 OpenAPI parameters
            openapiParameters.push({
              name: param.key,
              in: 'query',
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
      const pathParameters: any[] = [];
      pathParams.forEach((param: any) => {
        if (param.key && param.zod) {
          pathParameters.push({
            name: param.key,
            in: 'path',
            required: true,
            schema: zodToOpenAPI(param.zod)
          });
        }
      });

      if (pathParameters.length > 0) {
        // 合并到已有的 parameters（可能已有 query 参数）
        if (!endpointConfig.metadata.openapi.parameters) {
          endpointConfig.metadata.openapi.parameters = [];
        }
        endpointConfig.metadata.openapi.parameters.push(...pathParameters);
      }
    }

    // 添加 header 参数到 OpenAPI（如果有）
    if (headerParams.length > 0) {
      const headerParameters: any[] = [];
      headerParams.forEach((param: any) => {
        if (param.key && param.zod) {
          headerParameters.push({
            name: param.key,
            in: 'header',
            required: !param.zod?.isOptional?.() || false,
            schema: zodToOpenAPI(param.zod)
          });
        }
      });

      if (headerParameters.length > 0) {
        // 合并到已有的 parameters
        if (!endpointConfig.metadata.openapi.parameters) {
          endpointConfig.metadata.openapi.parameters = [];
        }
        endpointConfig.metadata.openapi.parameters.push(...headerParameters);
      }
    }

    // 创建 better-auth endpoint
    const endpoint = createAuthEndpoint(
      fullPath,
      endpointConfig,
      async (ctx) => {
        const instance = root.get<any>(ControllerClass);
        const args = injectParameters(argsMetadata, ctx);
        const method = Reflect.get(instance, methodName);
        const result = await (method).bind(instance)(...args);
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
function injectParameters(argsMetadata: any, ctx: any): any[] {
  const sortedMetadata = Object.values(argsMetadata).sort(
    (a: any, b: any) => a.index - b.index
  );

  return sortedMetadata.map((metadata: any) => {
    const { type, key: fieldKey, zod } = metadata;

    switch (type) {
      case ParamType.BODY:
        const bodyValue = fieldKey ? ctx.body[fieldKey] : ctx.body;
        return zod ? zod.parse(bodyValue) : bodyValue;

      case ParamType.SESSION:
        return ctx.context.session;

      case ParamType.QUERY:
        return fieldKey ? ctx.query[fieldKey] : ctx.query;

      case ParamType.PARAM:
        return fieldKey ? ctx.params[fieldKey] : ctx.params;

      case ParamType.HEADER:
        return fieldKey ? ctx.headers.get(fieldKey) : ctx.headers;

      default:
        return undefined;
    }
  });
}
