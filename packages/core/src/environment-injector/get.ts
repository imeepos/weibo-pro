import type { InjectionTokenType } from '../injector';
import type { EnvironmentInjector } from '../environment-injector';
import { resolveForwardRefCached } from '../forward-ref';
import { EnvironmentInjectorUtils } from '../environment-injector-utils';
import { getState } from './state';
import { createInstance } from './resolve';
import { tryAutoResolveProvider, validateToken } from './auto-provider';

/**
 * 获取指定令牌的依赖实例
 */
export function resolveToken<T>(
  injector: EnvironmentInjector,
  token: InjectionTokenType<T>,
  def?: T,
): T {
  const state = getState(injector);
  // 解析ForwardRef
  const resolvedToken = resolveForwardRefCached(token);
  validateToken(resolvedToken);
  const tokenName = EnvironmentInjectorUtils.getTokenName(resolvedToken);
  // 检查注入器是否已销毁
  if (state.isDestroyed) {
    throw new Error('注入器已销毁');
  }
  // 检查缓存
  if (state.instances.has(resolvedToken)) {
    return state.instances.get(resolvedToken);
  }

  // 检查循环依赖
  if (state.resolvingTokens.has(resolvedToken)) {
    const pathStr = state.dependencyPath
      .map((t) => EnvironmentInjectorUtils.getTokenName(t))
      .join(' -> ');
    const errorMessage = `检测到循环依赖: ${pathStr} -> ${tokenName}`;
    throw new Error(errorMessage);
  }

  // 开始解析此令牌
  state.resolvingTokens.add(resolvedToken);
  state.dependencyPath.push(resolvedToken);

  try {
    let result: T;

    // 查找提供者
    const tokenProviders = state.providers.get(resolvedToken);
    if (tokenProviders) {
      result = createInstance(injector, resolvedToken, tokenProviders);
      // 非多值提供者才缓存实例
      if (!EnvironmentInjectorUtils.isMultiProvider(tokenProviders)) {
        state.instances.set(resolvedToken, result);
      }
    } else {
      // 尝试自动解析 providedIn 服务
      const autoProvider = tryAutoResolveProvider(injector, resolvedToken);
      if (autoProvider) {
        state.providers.set(resolvedToken, [autoProvider]);
        result = createInstance(injector, resolvedToken, [autoProvider]);
        state.instances.set(resolvedToken, result);
      } else {
        // 委托给父注入器
        result = injector.parent!.get(resolvedToken, def);
      }
    }

    return result;
  } finally {
    // 清理解析状态
    state.resolvingTokens.delete(resolvedToken);
    state.dependencyPath.pop();
  }
}
