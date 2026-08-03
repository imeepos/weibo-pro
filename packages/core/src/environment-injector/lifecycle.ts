import type { Provider } from '../provider';
import type { EnvironmentInjector } from '../environment-injector';
import { isOnInit, hasOnInitMetadata } from '../on-init';
import { isOnDestroy } from '../lifecycle';
import { APP_INITIALIZER, type Initializer } from '../app-initializer';
import { InitializerGraph } from '../initializer-graph';
import { resolveForwardRefCached } from '../forward-ref';
import { getState } from './state';

/**
 * 初始化注入器，调用所有标记 @OnInit() 的服务的 onModelInit() 方法
 *
 * 策略：
 * 1. 执行所有 APP_INITIALIZER（按依赖顺序）
 * 2. 初始化所有 @OnInit 服务
 */
export async function initInjector(injector: EnvironmentInjector): Promise<void> {
  await runAppInitializers(injector);
  await runOnInitServices(injector);
}

async function runAppInitializers(injector: EnvironmentInjector): Promise<void> {
  const initializers: Initializer[] = injector.get(APP_INITIALIZER, []) || [];
  if (initializers.length === 0) {
    return;
  }

  const graph = new InitializerGraph();

  for (const initializer of initializers) {
    const token = initializer.provide || initializer;
    const initFn = () => initializer.init();
    const dependencies = new Set(initializer.deps || []);

    graph.addNode(token, initFn, { dependencies });
  }

  await graph.execute();
}

async function runOnInitServices(injector: EnvironmentInjector): Promise<void> {
  const state = getState(injector);
  const initializedInstances = new Set<any>();

  for (const instance of state.instances.values()) {
    if (isOnInit(instance)) {
      await initInstance(instance);
      initializedInstances.add(instance);
    }
  }

  for (const [token, providers] of state.providers.entries()) {
    for (const provider of providers) {
      const targetClass = extractClassFromProvider(provider);
      if (targetClass && hasOnInitMetadata(targetClass)) {
        const instance = injector.get(token);

        if (!initializedInstances.has(instance) && isOnInit(instance)) {
          await initInstance(instance);
          initializedInstances.add(instance);
        }
      }
    }
  }
}

/**
 * 从 Provider 中提取类定义
 */
function extractClassFromProvider(provider: Provider): any {
  if ('useClass' in provider) {
    return resolveForwardRefCached(provider.useClass);
  }

  // useFactory: 检查 provider.provide 本身是否是带有 @OnInit() 元数据的类
  if ('useFactory' in provider && typeof provider.provide === 'function') {
    return provider.provide;
  }

  // ConstructorProvider（直接使用 provide 作为类）
  if (
    !('useValue' in provider) &&
    !('useFactory' in provider) &&
    !('useExisting' in provider) &&
    typeof provider.provide === 'function'
  ) {
    return provider.provide;
  }

  return null;
}

/**
 * 初始化单个实例（严格模式）
 */
async function initInstance(instance: any): Promise<void> {
  try {
    await instance.onInit();
  } catch (error) {
    const instanceName = instance.constructor?.name || 'Unknown';
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`@OnInit 服务初始化失败 [${instanceName}]: ${errorMsg}`);
  }
}

/**
 * 销毁注入器，清理所有实例并调用 OnDestroy 生命周期钩子
 */
export async function destroyInjector(
  injector: EnvironmentInjector,
): Promise<void> {
  const state = getState(injector);

  if (state.isDestroyed) {
    return; // 防止重复销毁
  }

  state.isDestroyed = true;

  // 销毁所有普通实例
  for (const instance of state.instances.values()) {
    await destroyInstance(instance);
  }
  // 清理所有数据结构
  state.instances.clear();
  state.resolvingTokens.clear();
  state.dependencyPath.length = 0;
}

/**
 * 销毁单个实例
 */
async function destroyInstance(instance: any): Promise<void> {
  try {
    // 检查是否实现了 OnDestroy 接口
    if (isOnDestroy(instance)) {
      await instance.onDestroy();
    }
  } catch (_error) {
    // 吞没销毁过程中的错误，不影响其他实例的销毁
    // 在生产环境中可以考虑记录日志
  }
}
