import type { Action, ActionReducer } from '../models';
import {
  isPlainObject,
  isUndefined,
  isNull,
  isNumber,
  isBoolean,
  isString,
  isArray,
  isComponent,
  RUNTIME_CHECK_URL,
} from './utils';

/**
 * 序列化检查 MetaReducer
 *
 * 检测 action 和 state 中的不可序列化对象（如 Date、函数、Map 等）
 * 帮助避免状态持久化和时间旅行调试的问题
 */
export function serializationCheckMetaReducer(
  reducer: ActionReducer<any, any>,
  checks: { action: (action: Action) => boolean; state: () => boolean }
): ActionReducer<any, any> {
  return function (state, action) {
    if (checks.action(action)) {
      const unserializableAction = getUnserializable(action);
      throwIfUnserializable(unserializableAction, 'action');
    }

    const nextState = reducer(state, action);

    if (checks.state()) {
      const unserializableState = getUnserializable(nextState);
      throwIfUnserializable(unserializableState, 'state');
    }

    return nextState;
  };
}

/**
 * 递归查找不可序列化的值
 */
function getUnserializable(
  target?: any,
  path: string[] = []
): false | { path: string[]; value: any } {
  // undefined 或 null 在根路径时为不可序列化
  if ((isUndefined(target) || isNull(target)) && path.length === 0) {
    return {
      path: ['root'],
      value: target,
    };
  }

  const keys = Object.keys(target);
  return keys.reduce<false | { path: string[]; value: any }>((result, key) => {
    if (result) return result;

    const value = target[key];

    // 忽略组件实例（Angular/React）
    if (isComponent(value)) return result;

    // 基本可序列化类型
    if (
      isUndefined(value) ||
      isNull(value) ||
      isNumber(value) ||
      isBoolean(value) ||
      isString(value) ||
      isArray(value)
    ) {
      return false;
    }

    // 纯对象递归检查
    if (isPlainObject(value)) {
      return getUnserializable(value, [...path, key]);
    }

    // 其他类型均为不可序列化（Date、Function、Map、Set 等）
    return {
      path: [...path, key],
      value,
    };
  }, false);
}

/**
 * 抛出不可序列化错误
 */
function throwIfUnserializable(
  unserializable: false | { path: string[]; value: any },
  context: 'state' | 'action'
): void {
  if (unserializable === false) return;

  const unserializablePath = unserializable.path.join('.');
  const error: any = new Error(
    `检测到不可序列化的 ${context}，路径："${unserializablePath}"。` +
      `值类型：${Object.prototype.toString.call(unserializable.value)}。` +
      `详见：${RUNTIME_CHECK_URL}#strict${context}serializability`
  );

  error.value = unserializable.value;
  error.unserializablePath = unserializablePath;

  throw error;
}
