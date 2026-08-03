import { Injector, InjectionTokenType, Type, isType } from './injector';
import { NullInjector } from './null-injector';
import { Provider } from './provider';
import { InjectorScope } from './injectable';
import { createState } from './environment-injector/state';
import { resolveToken } from './environment-injector/get';
import { setupProviders } from './environment-injector/providers';
import { initInjector, destroyInjector } from './environment-injector/lifecycle';
import * as factory from './environment-injector/factories';

/**
 * 环境注入器，提供全局作用域的依赖管理
 * 支持多种提供者类型、实例缓存和多值注入
 *
 * 实现按职责拆分到 environment-injector/ 子目录：
 * - get.ts       令牌解析
 * - resolve.ts   实例创建与依赖解析
 * - auto-provider.ts  providedIn 自动解析
 * - providers.ts Provider 注册
 * - lifecycle.ts 初始化与销毁生命周期
 * - factories.ts 静态工厂与全局单例
 * - state.ts     内部状态管理
 */
export class EnvironmentInjector extends Injector {
  /**
   * 注入器作用域，决定如何处理 providedIn 服务
   */
  public readonly scope: InjectorScope;

  constructor(
    providers: Provider[],
    parent?: Injector,
    scope: InjectorScope = 'root',
  ) {
    super(parent || new NullInjector());
    this.scope = scope;
    createState(this);
    setupProviders(this, [...providers, { provide: Injector, useValue: this }]);
  }

  /**
   * 创建支持自动提供者解析的环境注入器
   */
  static createWithAutoProviders(
    manualProviders: Provider[],
    parent?: Injector,
    scope: InjectorScope = 'auto',
  ): EnvironmentInjector {
    return factory.createWithAutoProviders(
      EnvironmentInjector,
      manualProviders,
      parent,
      scope,
    );
  }

  /**
   * 创建根注入器（全局单例）
   */
  static createRootInjector(providers: Provider[] = []): EnvironmentInjector {
    return factory.createRootInjector(EnvironmentInjector, providers);
  }

  /**
   * 获取全局根注入器实例
   */
  static getRootInjector(): EnvironmentInjector | null {
    return factory.getRootInjector();
  }

  /**
   * 重置平台注入器（主要用于测试）
   *
   * @internal 仅供内部使用
   */
  static resetPlatformInjector(): void {
    factory.resetPlatformInjector();
  }

  /**
   * 重置根注入器和平台注入器（主要用于测试）
   *
   * @internal 仅供内部使用
   */
  static resetRootInjector(): void {
    factory.resetRootInjector();
  }

  /**
   * 创建平台注入器（全局单例）
   */
  static createPlatformInjector(
    providers: Provider[] = [],
  ): EnvironmentInjector {
    return factory.createPlatformInjector(EnvironmentInjector, providers);
  }

  /**
   * 获取全局平台注入器实例
   */
  static getPlatformInjector(): EnvironmentInjector | null {
    return factory.getPlatformInjector();
  }

  /**
   * 创建应用注入器
   */
  static createApplicationInjector(
    providers: Provider[] = [],
  ): EnvironmentInjector {
    return factory.createApplicationInjector(EnvironmentInjector, providers);
  }

  /**
   * 创建功能模块注入器
   */
  static createFeatureInjector(
    providers: Provider[],
    parentInjector: Injector,
  ): EnvironmentInjector {
    return factory.createFeatureInjector(
      EnvironmentInjector,
      providers,
      parentInjector,
    );
  }

  /**
   * 获取指定令牌的依赖实例
   */
  get<T>(token: InjectionTokenType<T>, def?: T): T {
    return resolveToken(this, token, def);
  }

  set(providers: (Provider | Type<any>)[]): void {
    const list = providers.map((it) => {
      if (isType(it)) {
        return { provide: it, useClass: it } as Provider;
      }
      return it as Provider;
    });
    setupProviders(this, list);
  }

  /**
   * 初始化注入器，调用所有标记 @OnInit() 的服务的 onModelInit() 方法
   */
  async init(): Promise<void> {
    await initInjector(this);
  }

  /**
   * 销毁注入器，清理所有实例并调用 OnDestroy 生命周期钩子
   */
  async destroy(): Promise<void> {
    await destroyInjector(this);
  }
}

export const root = EnvironmentInjector.createRootInjector([]);
