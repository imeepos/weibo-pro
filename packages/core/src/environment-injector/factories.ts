import { NullInjector } from '../null-injector';
import type { Injector } from '../injector';
import type { Provider } from '../provider';
import type { InjectorScope } from '../injectable';
import type { EnvironmentInjector } from '../environment-injector';

/**
 * 环境注入器构造函数类型
 */
export interface EnvironmentInjectorConstructor {
  new (
    providers: Provider[],
    parent?: Injector,
    scope?: InjectorScope,
  ): EnvironmentInjector;
}

/** 全局根注入器实例（单例） */
let rootInjectorInstance: EnvironmentInjector | null = null;

/** 全局平台注入器实例（单例） */
let platformInjectorInstance: EnvironmentInjector | null = null;

/**
 * 创建支持自动提供者解析的环境注入器
 */
export function createWithAutoProviders(
  InjectorCtor: EnvironmentInjectorConstructor,
  manualProviders: Provider[],
  parent?: Injector,
  scope: InjectorScope = 'auto',
): EnvironmentInjector {
  return new InjectorCtor(manualProviders, parent, scope);
}

/**
 * 创建根注入器（全局单例）
 *
 * 根注入器是基础层注入器，全局唯一，通常作为平台注入器的父级。
 * 标记为 @Injectable({ providedIn: 'root' }) 的服务会在此注入器中注册。
 *
 * @throws Error 如果根注入器已经存在
 */
export function createRootInjector(
  InjectorCtor: EnvironmentInjectorConstructor,
  providers: Provider[] = [],
): EnvironmentInjector {
  if (rootInjectorInstance) {
    throw new Error(
      'Root injector already exists! Root injector must be globally unique.',
    );
  }
  rootInjectorInstance = new InjectorCtor(providers, new NullInjector(), 'root');
  return rootInjectorInstance;
}

/**
 * 获取全局根注入器实例
 */
export function getRootInjector(): EnvironmentInjector | null {
  return rootInjectorInstance;
}

/**
 * 重置平台注入器（主要用于测试）
 *
 * @internal 仅供内部使用
 */
export function resetPlatformInjector(): void {
  if (platformInjectorInstance) {
    platformInjectorInstance.destroy();
    platformInjectorInstance = null;
  }
}

/**
 * 重置根注入器和平台注入器（主要用于测试）
 *
 * @internal 仅供内部使用
 */
export function resetRootInjector(): void {
  // 先重置平台注入器（因为它依赖根注入器）
  resetPlatformInjector();

  if (rootInjectorInstance) {
    rootInjectorInstance.destroy();
    rootInjectorInstance = null;
  }
}

/**
 * 创建平台注入器（全局单例）
 *
 * 平台注入器用于存储跨应用共享的服务，全局唯一，自动使用全局根注入器作为父级。
 * 标记为 @Injectable({ providedIn: 'platform' }) 的服务会在此注入器中注册。
 *
 * @throws Error 如果平台注入器已经存在或全局根注入器不存在
 */
export function createPlatformInjector(
  InjectorCtor: EnvironmentInjectorConstructor,
  providers: Provider[] = [],
): EnvironmentInjector {
  if (platformInjectorInstance) {
    throw new Error(
      'Platform injector already exists! Platform injector must be globally unique.',
    );
  }

  // 检查是否存在全局根注入器
  const globalRootInjector = getRootInjector();
  if (!globalRootInjector) {
    throw new Error(
      'Root injector not found! Please create a root injector first using createRootInjector() before creating platform injector.',
    );
  }

  platformInjectorInstance = new InjectorCtor(
    providers,
    globalRootInjector,
    'platform',
  );
  return platformInjectorInstance;
}

/**
 * 获取全局平台注入器实例
 */
export function getPlatformInjector(): EnvironmentInjector | null {
  return platformInjectorInstance;
}

/**
 * 创建应用注入器
 *
 * 应用注入器以全局平台注入器为父级，用于存储应用级的服务。
 * 标记为 @Injectable({ providedIn: 'application' }) 的服务会在此注入器中注册。
 *
 * @throws Error 如果全局平台注入器不存在
 */
export function createApplicationInjector(
  InjectorCtor: EnvironmentInjectorConstructor,
  providers: Provider[] = [],
): EnvironmentInjector {
  // 检查是否存在全局平台注入器
  const globalPlatformInjector = getPlatformInjector();
  if (!globalPlatformInjector) {
    throw new Error(
      'Platform injector not found! Please create a platform injector first using createPlatformInjector() before creating application injector.',
    );
  }
  return new InjectorCtor(providers, globalPlatformInjector, 'application');
}

/**
 * 创建功能模块注入器
 *
 * 功能注入器通常以应用注入器为父级，用于存储功能模块级的服务。
 */
export function createFeatureInjector(
  InjectorCtor: EnvironmentInjectorConstructor,
  providers: Provider[],
  parentInjector: Injector,
): EnvironmentInjector {
  return new InjectorCtor(providers, parentInjector, 'feature');
}
