import type { Injector, InjectionTokenType } from '../injector';
import type { InjectOptions } from '../inject-options';
import type { Provider } from '../provider';
import type { EnvironmentInjector } from '../environment-injector';
import { NullInjector } from '../null-injector';
import { getInjectMetadata, getInjectOptionsMetadata } from '../inject';
import {
  resolveForwardRefCached,
  resolveForwardRefsInDeps,
} from '../forward-ref';
import {
  InternalInjectFlags,
  convertInjectOptionsToFlags,
  hasFlag,
} from '../internal-inject-flags';
import { EnvironmentInjectorUtils } from '../environment-injector-utils';
import { getState } from './state';
import { tryAutoResolveProvider } from './auto-provider';

/**
 * 根据提供者创建实例
 */
export function createInstance<T>(
  injector: EnvironmentInjector,
  _token: InjectionTokenType<T>,
  providers: Provider[],
): T {
  // Set 模式
  if (EnvironmentInjectorUtils.isSetProvider(providers)) {
    const set = new Set<any>();
    for (const p of providers) {
      if (p.multi !== 'set') continue;
      set.add(createSingleInstance(injector, p));
    }
    return set as T;
  }

  // Map 模式
  if (EnvironmentInjectorUtils.isMapProvider(providers)) {
    const map = new Map<any, any>();
    for (const p of providers) {
      if (p.multi !== 'map') continue;
      EnvironmentInjectorUtils.validateMapProvider(p);
      // 后注册的覆盖先注册的（与单值行为一致）
      map.set(p.mapKey, createSingleInstance(injector, p));
    }
    return map as T;
  }

  // Record 模式
  if (EnvironmentInjectorUtils.isRecordProvider(providers)) {
    const record: Record<string, any> = {};
    for (const p of providers) {
      if (p.multi !== 'record') continue;
      EnvironmentInjectorUtils.validateRecordProvider(p);
      // 后注册的覆盖先注册的（与单值行为一致）
      record[p.key!] = createSingleInstance(injector, p);
    }
    return record as T;
  }

  // 数组模式（原有逻辑）
  if (EnvironmentInjectorUtils.isArrayProvider(providers)) {
    return providers
      .filter((p) => p.multi === true)
      .map((p) => createSingleInstance(injector, p)) as any;
  }

  // 对于非多值注入，使用最后注册的提供者（后面的覆盖前面的）
  const lastProvider = providers[providers.length - 1];
  if (!lastProvider) {
    throw new Error(`No provider found for token: ${String(_token)}`);
  }
  return createSingleInstance(injector, lastProvider);
}

/**
 * 根据单个提供者创建实例
 */
export function createSingleInstance<T>(
  injector: EnvironmentInjector,
  provider: Provider,
): T {
  if ('useValue' in provider) {
    return provider.useValue;
  }

  if ('useClass' in provider) {
    const resolvedClass = resolveForwardRefCached(provider.useClass);
    return createInstanceWithDI(injector, resolvedClass);
  }

  if ('useFactory' in provider) {
    const resolvedDeps = resolveForwardRefsInDeps(provider.deps);
    const deps = (resolvedDeps || []).map((dep) => injector.get(dep));
    return provider.useFactory(...deps);
  }

  if ('useExisting' in provider) {
    const resolvedExisting = resolveForwardRefCached(provider.useExisting);
    return injector.get(resolvedExisting);
  }

  // ConstructorProvider
  return createInstanceWithDI(injector, provider.provide as any);
}

/**
 * 使用依赖注入创建类实例
 */
export function createInstanceWithDI<T>(
  injector: EnvironmentInjector,
  ClassConstructor: new (...args: any[]) => T,
): T {
  // 获取注入元数据
  const injectMetadata = getInjectMetadata(ClassConstructor);
  const injectOptions = getInjectOptionsMetadata(ClassConstructor);

  if (!injectMetadata || injectMetadata.length === 0) {
    // 没有依赖，直接创建
    return new ClassConstructor();
  }

  // 解析所有依赖
  const dependencies = injectMetadata.map((token, index) => {
    if (token === undefined) {
      throw new Error(
        `Cannot resolve dependency at index ${index} for ${ClassConstructor.name}. Make sure to use @Inject() decorator.`,
      );
    }

    const options = injectOptions?.[index] || {};
    const resolvedToken = resolveForwardRefCached(token);
    return resolveDependency(injector, resolvedToken, options);
  });

  return new ClassConstructor(...dependencies);
}

/**
 * 根据注入选项解析依赖
 * 支持 optional, skipSelf, self, host 选项
 * 🚀 使用位标志优化性能
 */
export function resolveDependency<T>(
  injector: EnvironmentInjector,
  token: InjectionTokenType<T>,
  options: InjectOptions,
): T;

/**
 * 根据内部标志位解析依赖 (性能优化版本)
 * 🚀 直接使用位标志，避免对象属性检查和转换开销
 */
export function resolveDependency<T>(
  injector: EnvironmentInjector,
  token: InjectionTokenType<T>,
  flags: InternalInjectFlags,
): T;

/**
 * 实际的依赖解析实现
 */
export function resolveDependency<T>(
  injector: EnvironmentInjector,
  token: InjectionTokenType<T>,
  optionsOrFlags: InjectOptions | InternalInjectFlags,
): T {
  // 🚀 性能优化：统一处理为位标志
  let flags: InternalInjectFlags;

  if (typeof optionsOrFlags === 'number') {
    // 已经是位标志，直接使用
    flags = optionsOrFlags;
  } else {
    // 是选项对象，需要验证和转换
    EnvironmentInjectorUtils.validateInjectOptions(optionsOrFlags);
    flags = convertInjectOptionsToFlags(optionsOrFlags);
  }

  try {
    // 🚀 使用位运算代替对象属性检查，提高性能
    if (hasFlag(flags, InternalInjectFlags.SkipSelf)) {
      // skipSelf: 跳过当前注入器，从父注入器开始查找
      return injector.parent!.get(token);
    }

    if (hasFlag(flags, InternalInjectFlags.Self)) {
      // self: 只在当前注入器查找，不查找父注入器
      return getSelf(injector, token);
    }

    if (hasFlag(flags, InternalInjectFlags.Host)) {
      // host: 在宿主注入器（根注入器）中查找
      return getFromHost(injector, token);
    }

    // 默认行为：正常的层次化查找
    return injector.get(token);
  } catch (error) {
    // 🚀 使用位运算检查可选标志
    if (hasFlag(flags, InternalInjectFlags.Optional)) {
      return null as any;
    }
    throw error;
  }
}

/**
 * 只在当前注入器中查找，不查找父注入器
 */
export function getSelf<T>(
  injector: EnvironmentInjector,
  token: InjectionTokenType<T>,
): T {
  const state = getState(injector);

  // 检查注入器是否已销毁
  if (state.isDestroyed) {
    throw new Error('注入器已销毁');
  }

  // 检查缓存
  if (state.instances.has(token)) {
    return state.instances.get(token);
  }

  // 检查循环依赖
  if (state.resolvingTokens.has(token)) {
    const tokenName = EnvironmentInjectorUtils.getTokenName(token);
    const pathStr = state.dependencyPath
      .map((t) => EnvironmentInjectorUtils.getTokenName(t))
      .join(' -> ');
    throw new Error(`检测到循环依赖: ${pathStr} -> ${tokenName}`);
  }

  // 开始解析此令牌
  state.resolvingTokens.add(token);
  state.dependencyPath.push(token);

  try {
    // 只查找当前注入器的提供者，不查找父注入器
    const tokenProviders = state.providers.get(token);
    if (tokenProviders) {
      const result = createInstance(injector, token, tokenProviders);
      // 非多值提供者才缓存实例
      if (!EnvironmentInjectorUtils.isMultiProvider(tokenProviders)) {
        state.instances.set(token, result);
      }
      return result;
    }

    // 尝试自动解析 providedIn 服务
    const autoProvider = tryAutoResolveProvider(injector, token);
    if (autoProvider) {
      state.providers.set(token, [autoProvider]);
      const result = createInstance(injector, token, [autoProvider]);
      state.instances.set(token, result);
      return result;
    }

    // self 选项不允许查找父注入器，直接抛出错误
    const tokenName = EnvironmentInjectorUtils.getTokenName(token);
    throw new Error(`No provider for ${tokenName}!`);
  } finally {
    // 清理解析状态
    state.resolvingTokens.delete(token);
    state.dependencyPath.pop();
  }
}

/**
 * 在宿主注入器（根注入器）中查找依赖
 * host 选项查找最顶层的父注入器，如果没有父注入器，则查找不到
 */
export function getFromHost<T>(
  injector: EnvironmentInjector,
  token: InjectionTokenType<T>,
): T {
  // 找到根注入器（宿主注入器）
  let hostInjector: Injector = injector;
  while (
    hostInjector.parent &&
    !(hostInjector.parent instanceof NullInjector)
  ) {
    hostInjector = hostInjector.parent;
  }

  // 如果宿主注入器就是当前注入器（即没有父注入器），
  // 那么 host 应该查找不到，直接抛出错误
  if (hostInjector === injector) {
    const tokenName = EnvironmentInjectorUtils.getTokenName(token);
    throw new Error(`No provider for ${tokenName}!`);
  }

  // 委托给宿主注入器的 get 方法
  return hostInjector.get(token);
}
