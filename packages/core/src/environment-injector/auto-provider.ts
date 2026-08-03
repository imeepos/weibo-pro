import { getInjectableMetadata, type InjectorScope } from '../injectable';
import type { Provider } from '../provider';
import type { EnvironmentInjector } from '../environment-injector';
import { getState } from './state';

/**
 * 验证注入令牌是否合法
 * 阻止使用 Object 作为注入令牌（因为无法序列化成可读字符串）
 *
 * 允许的类型：
 * - 有 name 属性的（类、函数）- 可通过 name 定位
 * - string, symbol - 本身就是可读的
 * - InjectionToken - 有 toString() 方法
 */
export function validateToken(token: any): void {
  // 只禁止 Object，因为它打印出来是 [object Object]，无法定位
  if (token === Object) {
    throw new Error(
      `不允许使用内置类型 "Object" 作为注入令牌！\n\n` +
        `Object 无法序列化成可读的调试信息。请使用以下方式之一：\n` +
        `1. 创建具体的类或接口，如 class MyService {}\n` +
        `2. 使用 InjectionToken，如 new InjectionToken<object>('my-config')\n` +
        `3. 使用字符串令牌，如 'MY_CONFIG'\n` +
        `4. 使用 Symbol 令牌，如 Symbol('MY_CONFIG')`,
    );
  }
}

/**
 * 尝试自动解析 providedIn 服务
 */
export function tryAutoResolveProvider(
  injector: EnvironmentInjector,
  token: any,
): Provider | null {
  const state = getState(injector);

  // 处理 InjectionToken（检查是否有 factory）
  if (token && typeof token === 'object' && 'factory' in token) {
    const factory = token.factory;

    // 如果有 factory，使用 factory 作为默认值
    if (factory && typeof factory === 'function') {
      // 避免重复解析
      if (state.autoResolvedClasses.has(token)) {
        return null;
      }

      state.autoResolvedClasses.add(token);

      return {
        provide: token,
        useFactory: factory,
        deps: [],
      };
    }

    return null;
  }

  // 处理函数/类类型的令牌
  if (typeof token !== 'function') {
    return null;
  }

  // 避免重复解析同一个类
  if (state.autoResolvedClasses.has(token)) {
    return null;
  }

  // 获取 Injectable 元数据
  const metadata = getInjectableMetadata(token);
  if (!metadata || metadata.providedIn === null) {
    return null;
  }

  // 检查作用域匹配
  if (!shouldAutoResolve(injector, metadata.providedIn)) {
    return null;
  }

  // 标记为已解析，避免循环
  state.autoResolvedClasses.add(token);

  // 创建提供者
  if (metadata.useFactory) {
    return {
      provide: token,
      useFactory: metadata.useFactory,
      deps: metadata.deps || [],
    };
  } else {
    return {
      provide: token,
      useClass: token,
    };
  }
}

/**
 * 判断是否应该在当前注入器中自动解析指定作用域的服务
 */
export function shouldAutoResolve(
  injector: EnvironmentInjector,
  providedIn: InjectorScope | null | undefined,
): boolean {
  if (providedIn === null) {
    return false;
  }
  return providedIn === 'auto' || injector.scope === providedIn;
}
