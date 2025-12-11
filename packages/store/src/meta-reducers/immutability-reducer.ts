import type { Action, ActionReducer } from '../models';
import { isFunction, hasOwnProperty, isObjectLike } from './utils';

/**
 * 不可变性检查 MetaReducer
 *
 * 通过深度冻结 action 和 state，在开发环境中捕获状态突变错误
 */
export function immutabilityCheckMetaReducer(
  reducer: ActionReducer<any, any>,
  checks: { action: (action: Action) => boolean; state: () => boolean }
): ActionReducer<any, any> {
  return function (state, action) {
    const frozenAction = checks.action(action) ? freeze(action) : action;
    const nextState = reducer(state, frozenAction);

    return checks.state() ? freeze(nextState) : nextState;
  };
}

/**
 * 深度冻结对象
 * 递归冻结对象的所有属性，防止运行时修改
 */
function freeze(target: any): any {
  Object.freeze(target);

  const targetIsFunction = isFunction(target);

  Object.getOwnPropertyNames(target).forEach((prop) => {
    // 忽略框架内部属性（Angular Ivy: ɵ 前缀）
    if (prop.startsWith('ɵ')) return;

    // 跳过函数的特殊属性
    if (
      hasOwnProperty(target, prop) &&
      (targetIsFunction
        ? prop !== 'caller' && prop !== 'callee' && prop !== 'arguments'
        : true)
    ) {
      const propValue = target[prop];

      if (
        (isObjectLike(propValue) || isFunction(propValue)) &&
        !Object.isFrozen(propValue)
      ) {
        freeze(propValue);
      }
    }
  });

  return target;
}
