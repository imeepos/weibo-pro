/**
 * 从可能包装的值中提取原始值。
 *
 * 支持：
 * - 拥有 getValue() 方法的响应式值
 * - 内部以 `_value` + `closed` + `observers` 标记的响应式对象
 */
export function extractValue(value: any): any {
  if (value && typeof value === 'object') {
    if (typeof value.getValue === 'function') {
      return value.getValue()
    }
    if ('_value' in value && 'closed' in value && 'observers' in value) {
      return value._value
    }
  }
  return value
}
