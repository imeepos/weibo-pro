import type { Action, MetaReducer, RuntimeChecks } from './models';
import {
  immutabilityCheckMetaReducer,
  serializationCheckMetaReducer,
} from './meta-reducers';

/**
 * 创建激活的运行时检查配置
 *
 * 在开发环境（process.env.NODE_ENV !== 'production'）中启用默认检查
 */
export function createActiveRuntimeChecks(
  runtimeChecks?: Partial<RuntimeChecks>
): RuntimeChecks {
  const isDevMode = process.env.NODE_ENV !== 'production';

  if (isDevMode) {
    return {
      strictStateSerializability: false,
      strictActionSerializability: false,
      strictStateImmutability: true,
      strictActionImmutability: true,
      strictActionWithinNgZone: false,
      strictActionTypeUniqueness: false,
      ...runtimeChecks,
    };
  }

  return {
    strictStateSerializability: false,
    strictActionSerializability: false,
    strictStateImmutability: false,
    strictActionImmutability: false,
    strictActionWithinNgZone: false,
    strictActionTypeUniqueness: false,
  };
}

/**
 * 创建序列化检查 MetaReducer
 */
export function createSerializationCheckMetaReducer(
  runtimeChecks: RuntimeChecks
): MetaReducer {
  const { strictActionSerializability, strictStateSerializability } =
    runtimeChecks;

  return (reducer) =>
    strictActionSerializability || strictStateSerializability
      ? serializationCheckMetaReducer(reducer, {
          action: (action) =>
            strictActionSerializability && !isNgrxAction(action),
          state: () => strictStateSerializability,
        })
      : reducer;
}

/**
 * 创建不可变性检查 MetaReducer
 */
export function createImmutabilityCheckMetaReducer(
  runtimeChecks: RuntimeChecks
): MetaReducer {
  const { strictActionImmutability, strictStateImmutability } = runtimeChecks;

  return (reducer) =>
    strictActionImmutability || strictStateImmutability
      ? immutabilityCheckMetaReducer(reducer, {
          action: (action) => strictActionImmutability && !isNgrxAction(action),
          state: () => strictStateImmutability,
        })
      : reducer;
}

/**
 * 检查是否为内部 Action（以 @ngrx 或 @sker 开头）
 * 内部 Action 跳过运行时检查
 */
function isNgrxAction(action: Action): boolean {
  return action.type.startsWith('@ngrx') || action.type.startsWith('@sker');
}

/**
 * 创建运行时检查 MetaReducers 数组
 *
 * @param runtimeChecks - 运行时检查配置
 * @returns MetaReducer 数组
 */
export function createRuntimeCheckMetaReducers(
  runtimeChecks?: Partial<RuntimeChecks>
): MetaReducer[] {
  const activeChecks = createActiveRuntimeChecks(runtimeChecks);
  const metaReducers: MetaReducer[] = [];

  // 添加不可变性检查
  const immutabilityCheck = createImmutabilityCheckMetaReducer(activeChecks);
  if (
    activeChecks.strictStateImmutability ||
    activeChecks.strictActionImmutability
  ) {
    metaReducers.push(immutabilityCheck);
  }

  // 添加序列化检查
  const serializationCheck = createSerializationCheckMetaReducer(activeChecks);
  if (
    activeChecks.strictStateSerializability ||
    activeChecks.strictActionSerializability
  ) {
    metaReducers.push(serializationCheck);
  }

  return metaReducers;
}
