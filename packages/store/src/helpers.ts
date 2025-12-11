/**
 * 首字母大写
 */
export const capitalize = <T extends string>(text: T): Capitalize<T> =>
  (text.charAt(0).toUpperCase() + text.substring(1)) as Capitalize<T>

/**
 * 首字母小写
 */
export const uncapitalize = <T extends string>(text: T): Uncapitalize<T> =>
  (text.charAt(0).toLowerCase() + text.substring(1)) as Uncapitalize<T>

/**
 * 断言值已定义（非 null/undefined）
 */
export const assertDefined = <T>(
  value: T | null | undefined,
  name: string,
): asserts value is T => {
  if (value === null || value === undefined) {
    throw new Error(`${name} 必须定义`)
  }
}
