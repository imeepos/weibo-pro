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
      root.set([
        { provide: prefix, useClass: target },
        { provide: target, useClass: target },
      ]);
    } else {
      Reflect.defineMetadata(PATH_METADATA, prefix || '', target);
      root.set([
        { provide: CONTROLLES, multi: true, useValue: target }
      ]);
    }
  };
}

// 响应 schema 元数据键
export const RESPONSE_SCHEMA_METADATA = 'response-schema';

/**
 * 创建 HTTP 方法装饰器的工厂函数
 *
 * 优雅设计：
 * - 统一创建所有 HTTP 方法装饰器
 * - 避免重复代码，确保一致性
 * - 支持路径参数和元数据注入
 */
function createHttpMethodDecorator(method: RequestMethod): (path?: string | any, zod?: any) => MethodDecorator {
  /**
   * 支持两种方式使用，schema定义返回值和路径参数定义路径
   * @Post('/demo', z.object({ name: z.string() }))
   * @Post(z.object({ name: z.string() }))
   */
  return (path?: string | any, zod?: any) => (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    let routePath: string;
    let responseSchema: any;

    // 检测第一个参数是否为 zod schema
    const isZodSchema = path && typeof path === 'object' && ('_def' in path || 'parse' in path || 'safeParse' in path);

    if (isZodSchema) {
      // 模式 2: @Post(z.object({ name: z.string() }))
      routePath = '/';
      responseSchema = path;
    } else {
      // 模式 1: @Post('/demo', z.object({ name: z.string() }))
      routePath = path || '/';
      responseSchema = zod;
    }

    Reflect.defineMetadata(PATH_METADATA, routePath, descriptor.value);
    Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value);

    if (responseSchema) {
      Reflect.defineMetadata(RESPONSE_SCHEMA_METADATA, responseSchema, descriptor.value);
    }
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
 * 注入上传的文件
 *
 * 存在即合理：
 * - 配合 UseInterceptors(FileInterceptor('file')) 使用
 * - 从请求中提取 Multer 处理后的文件对象
 *
 * @param fieldName 可选的文件字段名（用于多文件上传）
 *
 * @example
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * async upload(@UploadedFile() file: Express.Multer.File) {
 *   return { filename: file.originalname };
 * }
 */
export const UploadedFile = (fieldName?: string): ParameterDecorator => {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (!propertyKey) {
      throw new Error('参数装饰器只能用于方法参数');
    }

    const methodTarget = target as Record<string | symbol, any>;
    const existingMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, methodTarget[propertyKey]) || {};

    const metadataKey = `${ParamType.UPLOADED_FILE}:${parameterIndex}`;

    existingMetadata[metadataKey] = {
      index: parameterIndex,
      type: ParamType.UPLOADED_FILE,
      key: fieldName,
    };

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, existingMetadata, methodTarget[propertyKey]);
  };
};

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
    Reflect.defineMetadata(MIDDLEWARE_METADATA, { permissions }, descriptor.value);
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
    Reflect.defineMetadata(OPENAPI_DESCRIPTION_METADATA, description, descriptor.value);
    if (tags) {
      Reflect.defineMetadata(OPENAPI_TAGS_METADATA, tags, descriptor.value);
    }
  };
}

/**
 * 应用拦截器到方法或类
 *
 * 存在即合理：
 * - 文件上传：FileInterceptor 处理 multipart/form-data
 * - 响应转换：TransformInterceptor 统一响应格式
 * - 日志记录：LoggingInterceptor 记录请求日志
 *
 * 优雅设计：
 * - 支持单个或多个拦截器
 * - 支持类级别和方法级别应用
 * - 元数据存储拦截器实例或类
 *
 * @param interceptors 拦截器实例或类（可以是数组）
 *
 * @example
 * // 方法级别
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * async upload(@UploadedFile() file: Express.Multer.File) {}
 *
 * // 类级别
 * @Controller('api')
 * @UseInterceptors(LoggingInterceptor, TransformInterceptor)
 * export class ApiController {}
 */
export function UseInterceptors(...interceptors: any[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      // 方法装饰器
      Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, descriptor.value);
    } else {
      // 类装饰器
      Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, target);
    }
  };
}