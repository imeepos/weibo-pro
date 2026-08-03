import type { Provider } from '../provider';
import type { EnvironmentInjector } from '../environment-injector';

/**
 * EnvironmentInjector 内部状态
 *
 * 通过 WeakMap 将状态与注入器实例关联，既避免将内部实现细节暴露到公开 API，
 * 又允许将大类的实现按职责拆分到多个独立模块。
 */
export interface EnvironmentInjectorState {
  /** 实例缓存 */
  instances: Map<any, any>;
  /** Provider 存储（支持多值注入） */
  providers: Map<any, Provider[]>;
  /** 已自动解析的类 */
  autoResolvedClasses: Set<any>;
  /** 正在解析的令牌（循环依赖检测） */
  resolvingTokens: Set<any>;
  /** 依赖解析路径（循环依赖检测） */
  dependencyPath: any[];
  /** 是否已销毁 */
  isDestroyed: boolean;
}

const stateMap = new WeakMap<EnvironmentInjector, EnvironmentInjectorState>();

/**
 * 为注入器创建内部状态
 */
export function createState(
  injector: EnvironmentInjector,
): EnvironmentInjectorState {
  const state: EnvironmentInjectorState = {
    instances: new Map(),
    providers: new Map(),
    autoResolvedClasses: new Set(),
    resolvingTokens: new Set(),
    dependencyPath: [],
    isDestroyed: false,
  };
  stateMap.set(injector, state);
  return state;
}

/**
 * 获取注入器的内部状态
 */
export function getState(
  injector: EnvironmentInjector,
): EnvironmentInjectorState {
  const state = stateMap.get(injector);
  if (!state) {
    throw new Error(
      'EnvironmentInjector state not found. Make sure the injector is constructed properly.',
    );
  }
  return state;
}
