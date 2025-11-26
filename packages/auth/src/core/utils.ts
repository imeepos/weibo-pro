import type { Type } from '@sker/core';

/**
 * 解析构造函数
 * 参考 @sker/workflow 的实现
 */
export function resolveConstructor(target: object | Type<any>): Type<any> {
  if (typeof target === 'function') {
    return target as Type<any>;
  }

  if (target && typeof target === 'object' && typeof (target as { constructor?: unknown }).constructor === 'function') {
    return (target as { constructor: Type<any> }).constructor;
  }

  throw new Error('Auth decorators expect to receive a class constructor or instance.');
}
