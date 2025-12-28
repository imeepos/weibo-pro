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

export function Controller(prefix?: string | Type<any>): ClassDecorator {
  return (target: any) => {
    if (typeof prefix === 'function') {
      // 从 SDK Controller 提取路径元数据
      const sdkControllerPath = Reflect.getMetadata(PATH_METADATA, prefix);
      if (sdkControllerPath !== undefined) {
        Reflect.defineMetadata(PATH_METADATA, sdkControllerPath, target);
      }
      root.set([
        { provide: prefix, useClass: target },
        { provide: target, useClass: target },
      ]);
    } else {
      Reflect.defineMetadata(PATH_METADATA, prefix || ``, target);
      root.set([
        { provide: CONTROLLES, multi: true, useValue: target }
      ]);
    }
  };
}

// 响应 schema 元数据键
export const RESPONSE_SCHEMA_METADATA = 'response-schema';
export const CONTENT_TYPE_METADATA = 'content-type';

/**
 * HTTP 方法配置接口
 *
 * 存在即合理：
 * - 提供灵活的配置方式
 * - 支持复杂场景的参数传递
 */
interface HttpMethodOptions {
  path?: string;
  schema?: any;
  contentType?: string;
}

/**
 * 创建 HTTP 方法装饰器的工厂函数
 *
 * 优雅设计：
 * - 统一创建所有 HTTP 方法装饰器
 * - 避免重复代码，确保一致性
 * - 支持路径参数和元数据注入
 * - 支持 contentType 配置，默认 application/json
 *
 * 使用方式：
 * @Post('/demo', z.object({ name: z.string() }))
 * @Post(z.object({ name: z.string() }))
 * @Post('/demo', z.object({ name: z.string() }), 'multipart/form-data')
 * @Post(z.object({ name: z.string() }), 'multipart/form-data')
 * @Post({ path: '/demo', schema: z.object({ name: z.string() }), contentType: 'multipart/form-data' })
 */
function createHttpMethodDecorator(method: RequestMethod) {
  return (
    pathOrOptionsOrSchema?: string | HttpMethodOptions | any,
    zodOrContentType?: any,
    contentType?: string
  ): MethodDecorator => {
    return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      let routePath: string;
      let responseSchema: any;
      let finalContentType: string = 'application/json';

      // 检测是否为配置对象
      const isOptionsObject = pathOrOptionsOrSchema
        && typeof pathOrOptionsOrSchema === 'object'
        && !('_def' in pathOrOptionsOrSchema)
        && !('parse' in pathOrOptionsOrSchema)
        && !('safeParse' in pathOrOptionsOrSchema);

      if (isOptionsObject) {
        // 模式 3: 配置对象
        const options = pathOrOptionsOrSchema as HttpMethodOptions;
        routePath = options.path || '/';
        responseSchema = options.schema;
        finalContentType = options.contentType || 'application/json';
      } else {
        // 检测第一个参数是否为 zod schema
        const isZodSchema = pathOrOptionsOrSchema
          && typeof pathOrOptionsOrSchema === 'object'
          && ('_def' in pathOrOptionsOrSchema || 'parse' in pathOrOptionsOrSchema || 'safeParse' in pathOrOptionsOrSchema);

        if (isZodSchema) {
          // 模式 2: @Post(schema) 或 @Post(schema, contentType)
          routePath = '/';
          responseSchema = pathOrOptionsOrSchema;
          finalContentType = typeof zodOrContentType === 'string'
            ? zodOrContentType
            : 'application/json';
        } else {
          // 模式 1: @Post(path, schema, contentType)
          routePath = pathOrOptionsOrSchema || '/';
          responseSchema = zodOrContentType && typeof zodOrContentType !== 'string'
            ? zodOrContentType
            : undefined;
          finalContentType = contentType || 'application/json';
        }
      }

      // 使用 target[propertyKey] 而不是 descriptor.value
      // 原因：抽象方法没有 descriptor.value，但仍需要附加元数据
      const methodTarget = descriptor.value || target[propertyKey];
      Reflect.defineMetadata(PATH_METADATA, routePath, methodTarget);
      Reflect.defineMetadata(METHOD_METADATA, method, methodTarget);
      Reflect.defineMetadata(CONTENT_TYPE_METADATA, finalContentType, methodTarget);

      if (responseSchema) {
        Reflect.defineMetadata(RESPONSE_SCHEMA_METADATA, responseSchema, methodTarget);
      }
    };
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
  SESSION = 'session',
  REQ = 'req',              // 注入完整的 Request 对象
  RES = 'res',              // 注入完整的 Response 对象
  HEADERS = 'headers',      // 注入所有请求头（作为对象）
  UPLOADED_FILE = 'uploaded_file',  // 注入上传的文件
}

// 路由参数元数据键
export const ROUTE_ARGS_METADATA = 'route-args';

// 中间件和 OpenAPI 元数据键
export const MIDDLEWARE_METADATA = 'middleware';
export const INTERCEPTORS_METADATA = 'interceptors';
export const OPENAPI_DESCRIPTION_METADATA = 'openapi:description';
export const OPENAPI_TAGS_METADATA = 'openapi:tags';

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
function createParamDecorator(type: ParamType): (key?: string | any, zod?: any) => ParameterDecorator {
  /**
   * 支持两种用法：
   * @Body('name', z.string()) name: string  - 明确指定字段名
   * @Body(z.string()) name: string          - 从参数名推断字段名
   */
  return (key?: string | any, zod?: any) => (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) {
      throw new Error('参数装饰器只能用于方法参数');
    }

    // 判断第一个参数是字段名还是 schema
    let fieldName: string | undefined;
    let schema: any;

    // 检测是否为 zod schema（具有 _def 或 parse/safeParse 方法）
    const isZodSchema = key && typeof key === 'object' && ('_def' in key || 'parse' in key || 'safeParse' in key);

    if (isZodSchema) {
      // 模式 2: @Body(z.string()) name: string
      fieldName = undefined; // 将从参数名推断
      schema = key;
    } else {
      // 模式 1: @Body('name', z.string()) name: string
      fieldName = key;
      schema = zod;
    }

    const methodTarget = target as Record<string | symbol, any>;
    const existingMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, methodTarget[propertyKey]) || {};

    // 使用参数索引作为唯一标识，确保元数据不会冲突
    const metadataKey = `${type}:${parameterIndex}`;

    existingMetadata[metadataKey] = {
      index: parameterIndex,
      type,
      key: fieldName,
      zod: schema
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
export const Session = createParamDecorator(ParamType.SESSION);

/**
 * 注入完整的 Request 对象
 *
 * 存在即合理：
 * - SSE 和流式响应需要完整的请求上下文
 * - 访问原始请求对象进行底层操作
 */
export const Req = createParamDecorator(ParamType.REQ);

/**
 * 注入完整的 Response 对象
 *
 * 存在即合理：
 * - SSE 需要直接操作响应流
 * - 自定义响应头和状态码
 * - 流式数据传输
 */
export const Res = createParamDecorator(ParamType.RES);

/**
 * 注入所有请求头（作为对象）
 *
 * 存在即合理：
 * - 与 Header 区分：Header('key') 获取单个，Headers() 获取全部
 * - 代理服务需要转发所有请求头
 *
 * @example
 * @Post()
 * async handler(@Headers() headers: Record<string, string>) {
 *   const contentType = headers['content-type'];
 * }
 */
export const Headers = createParamDecorator(ParamType.HEADERS);

/**
 * 权限装饰器
 *
 * 声明 endpoint 所需权限，自动应用 sessionMiddleware 和 permissionMiddleware
 *
 * @param permissions 权限配置对象
 * @example @RequirePermissions({ activity: ['create'] })
 */
export function RequirePermissions(permissions: any): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodTarget = descriptor.value || target[propertyKey];
    Reflect.defineMetadata(MIDDLEWARE_METADATA, { permissions }, methodTarget);
  };
}

/**
 * OpenAPI 文档装饰器
 *
 * 为 endpoint 添加描述和标签，用于生成 OpenAPI 文档
 *
 * @param description API 描述
 * @param tags OpenAPI 标签数组
 * @example @ApiDescription('创建活动', ['Activities'])
 */
export function ApiDescription(description: string, tags?: string[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const methodTarget = descriptor.value || target[propertyKey];
    Reflect.defineMetadata(OPENAPI_DESCRIPTION_METADATA, description, methodTarget);
    if (tags) {
      Reflect.defineMetadata(OPENAPI_TAGS_METADATA, tags, methodTarget);
    }
  };
}
