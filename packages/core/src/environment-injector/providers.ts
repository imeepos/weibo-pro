import type { Provider } from '../provider';
import type { EnvironmentInjector } from '../environment-injector';
import { EnvironmentInjectorUtils } from '../environment-injector-utils';
import { getState } from './state';
import { validateToken } from './auto-provider';

/**
 * 设置提供者映射
 */
export function setupProviders(
  injector: EnvironmentInjector,
  providers: Provider[],
): void {
  const state = getState(injector);
  providers.forEach((provider) => {
    validateToken(provider.provide);
    const existing = state.providers.get(provider.provide) || [];
    const updated = [...existing, provider];
    // 验证 Provider 一致性
    EnvironmentInjectorUtils.validateProviderConsistency(updated);
    state.providers.set(provider.provide, updated);
  });
}
