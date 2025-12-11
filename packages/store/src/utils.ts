/**
 * 类型守卫：是否为对象（非数组）
 */
export const isObject = (target: any): target is object =>
  typeof target === 'object' && target !== null && !Array.isArray(target)

/**
 * 类型守卫：是否为纯对象（Plain Object）
 */
export const isPlainObject = (target: any): target is object => {
  if (!isObject(target)) return false

  const targetPrototype = Object.getPrototypeOf(target)
  return targetPrototype === Object.prototype || targetPrototype === null
}
