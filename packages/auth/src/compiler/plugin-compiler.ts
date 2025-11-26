import { Injectable, root, Type } from '@sker/core';
import {
  AUTH_PLUGIN,
  AUTH_ENTITY,
  AUTH_FIELD,
  AUTH_ENDPOINT,
  AUTH_PARAMETER,
  AUTH_HOOK,
  AUTH_RATE_LIMIT
} from '../core/tokens';
import type {
  PluginMetadata,
  EntityMetadata,
  FieldMetadata,
  EndpointMetadata,
  ParameterMetadata,
  HookMetadata,
  RateLimitMetadata
} from '../core/types';

/**
 * PluginCompiler - 插件编译器
 * 将装饰器元数据编译为 Better Auth 原生插件格式
 */
@Injectable()
export class PluginCompiler {
  constructor() {}

  /**
   * 编译所有插件
   */
  compile(): any[] {
    const pluginMetadatas = root.get(AUTH_PLUGIN, []);
    return pluginMetadatas.map(meta => this.compilePlugin(meta));
  }

  /**
   * 编译单个插件
   */
  private compilePlugin(meta: PluginMetadata): any {
    const plugin: any = {
      id: meta.id
    };

    const schema = this.compileSchema(meta.target);
    if (Object.keys(schema).length > 0) {
      plugin.schema = schema;
    }

    const endpoints = this.compileEndpoints(meta.target);
    if (Object.keys(endpoints).length > 0) {
      plugin.endpoints = endpoints;
    }

    const hooks = this.compileHooks(meta.target);
    if (hooks.before.length > 0 || hooks.after.length > 0) {
      plugin.hooks = hooks;
    }

    const rateLimit = this.compileRateLimit(meta.target);
    if (rateLimit.length > 0) {
      plugin.rateLimit = rateLimit;
    }

    const $Infer = this.compileInfer(meta.target);
    if (Object.keys($Infer).length > 0) {
      plugin.$Infer = $Infer;
    }

    return plugin;
  }

  /**
   * 编译 Schema
   */
  private compileSchema(pluginClass: Type<any>): any {
    const entities = root.get(AUTH_ENTITY, []);
    const fields = root.get(AUTH_FIELD, []);

    const schema: any = {};

    entities.forEach(entity => {
      const entityFields = fields.filter(f => f.target === entity.target);

      if (entityFields.length > 0) {
        schema[entity.tableName] = {
          fields: entityFields.reduce((acc, field) => {
            acc[field.propertyKey as string] = {
              type: field.type,
              required: field.required,
              references: field.references,
              defaultValue: field.defaultValue,
              unique: field.unique
            };
            return acc;
          }, {} as any)
        };
      }
    });

    return schema;
  }

  /**
   * 编译 Endpoints
   */
  private compileEndpoints(pluginClass: Type<any>): any {
    const endpointMetadatas = root.get(AUTH_ENDPOINT, [])
      .filter(e => e.target === pluginClass);

    const endpoints: any = {};

    endpointMetadatas.forEach(meta => {
      const methodName = meta.propertyKey as string;
      const endpointName = methodName;

      endpoints[endpointName] = this.createEndpoint(pluginClass, meta);
    });

    return endpoints;
  }

  /**
   * 创建单个端点
   * 注意：这里返回一个配置对象，实际的 createAuthEndpoint 调用在运行时
   */
  private createEndpoint(pluginClass: Type<any>, meta: EndpointMetadata): any {
    return {
      path: meta.path,
      method: meta.method,
      requireAuth: meta.requireAuth,
      rateLimit: meta.rateLimit,
      handler: (ctx: any) => this.executeEndpoint(pluginClass, meta.propertyKey, ctx)
    };
  }

  /**
   * 执行端点方法（反射调用 + 参数注入）
   */
  private async executeEndpoint(
    pluginClass: Type<any>,
    methodName: string | symbol,
    ctx: any
  ): Promise<any> {
    const instance = root.get(pluginClass);

    const paramMetadatas = root.get(AUTH_PARAMETER, [])
      .filter(p => p.target === pluginClass && p.propertyKey === methodName)
      .sort((a, b) => a.parameterIndex - b.parameterIndex);

    const args = paramMetadatas.map(param => {
      switch (param.type) {
        case 'body':
          return ctx.body;
        case 'context':
          return ctx;
        case 'query':
          return ctx.query;
        case 'param':
          return ctx.params?.[param.paramName!];
        default:
          return undefined;
      }
    });

    return await (instance as any)[methodName](...args);
  }

  /**
   * 编译 Hooks
   */
  private compileHooks(pluginClass: Type<any>): any {
    const hookMetadatas = root.get(AUTH_HOOK, [])
      .filter(h => h.target === pluginClass);

    const hooks: any = { before: [], after: [] };

    hookMetadatas.forEach(meta => {
      const hook = {
        matcher: typeof meta.matcher === 'string'
          ? (ctx: any) => ctx.path === meta.matcher
          : meta.matcher,
        handler: async (ctx: any) => {
          const instance = root.get(pluginClass);
          return await (instance as any)[meta.propertyKey](ctx);
        }
      };

      if (meta.timing === 'before') {
        hooks.before.push(hook);
      } else {
        hooks.after.push(hook);
      }
    });

    return hooks;
  }

  /**
   * 编译 Rate Limit
   */
  private compileRateLimit(pluginClass: Type<any>): any[] {
    const rateLimits = root.get(AUTH_RATE_LIMIT, [])
      .filter(r => r.target === pluginClass);

    return rateLimits.map(meta => ({
      pathMatcher: typeof meta.pathMatcher === 'string'
        ? (path: string) => path === meta.pathMatcher
        : meta.pathMatcher,
      window: meta.window,
      max: meta.max
    }));
  }

  /**
   * 编译类型推断
   */
  private compileInfer(pluginClass: Type<any>): any {
    const entities = root.get(AUTH_ENTITY, []);
    const fields = root.get(AUTH_FIELD, []);

    const $Infer: any = {};

    entities.forEach(entity => {
      const entityFields = fields.filter(f => f.target === entity.target);

      if (entityFields.length > 0) {
        const typeObj: any = {};

        entityFields.forEach(field => {
          typeObj[field.propertyKey as string] = this.mapFieldTypeToTS(field.type);
        });

        $Infer[entity.tableName] = {} as typeof typeObj;
      }
    });

    return $Infer;
  }

  /**
   * 映射字段类型到 TypeScript 类型
   */
  private mapFieldTypeToTS(type: string): any {
    switch (type) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'date': return new Date();
      default: return undefined;
    }
  }
}
