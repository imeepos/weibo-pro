import { root } from '@sker/core';
import { AUTH_PLUGIN } from '../core/tokens';
import { resolveConstructor } from '../core/utils';

export interface AuthPluginOptions {
  id: string;
  description?: string;
}

/**
 * @AuthPlugin 装饰器
 * 标记插件类，定义插件 ID 和基础配置
 * 参考 @sker/workflow 的 @Node 装饰器
 */
export function AuthPlugin(options: AuthPluginOptions): ClassDecorator {
  return (target) => {
    const ctor = resolveConstructor(target as object);

    root.set([
      {
        provide: AUTH_PLUGIN,
        useValue: { ...options, target: ctor },
        multi: true
      },
      {
        provide: ctor,
        useClass: ctor
      }
    ]);
  };
}
