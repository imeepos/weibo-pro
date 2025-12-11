/**
 * Meta-Reducers 工具函数
 */

export const RUNTIME_CHECK_URL =
  'https://ngrx.io/guide/store/configuration/runtime-checks';

export const isFunction = (value: any): value is Function =>
  typeof value === 'function';

export const isUndefined = (value: any): value is undefined =>
  value === undefined;

export const isNull = (value: any): value is null => value === null;

export const isNumber = (value: any): value is number =>
  typeof value === 'number';

export const isBoolean = (value: any): value is boolean =>
  typeof value === 'boolean';

export const isString = (value: any): value is string =>
  typeof value === 'string';

export const isArray = Array.isArray;

export const isObjectLike = (value: any): boolean =>
  value !== null && typeof value === 'object';

export const isPlainObject = (value: any): value is object => {
  if (!isObjectLike(value)) return false;

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const hasOwnProperty = (object: any, property: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, property);

/**
 * 检测是否为组件实例（忽略 Angular/React 组件）
 * 通过检测特定属性来判断
 */
export const isComponent = (value: any): boolean => {
  return (
    isObjectLike(value) &&
    (hasOwnProperty(value, 'ɵcmp') || // Angular 组件标记
      hasOwnProperty(value, '$$typeof')) // React 组件标记
  );
};
