/**
 * PortDialog 的常量与校验工具
 */
export const INPUT_TYPES = ['string', 'text', 'number', 'boolean', 'date', 'select', 'image', 'video', 'audio', 'object', 'any'] as const
export const OUTPUT_TYPES = ['string', 'number', 'boolean', 'object', 'array', 'any'] as const

export const CONDITION_PRESETS = [
  { label: '等于', template: '$input === ' },
  { label: '不等于', template: '$input !== ' },
  { label: '大于', template: '$input > ' },
  { label: '小于', template: '$input < ' },
  { label: '包含', template: '$input.includes(' },
  { label: '默认', template: 'true' },
] as const

export function validateProperty(
  property: string,
  existingProperties: string[],
  currentProperty?: string
): string | null {
  if (!property) {
    return '属性名不能为空'
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(property)) {
    return '属性名必须以字母开头，只能包含字母、数字、下划线'
  }

  const isDuplicate = existingProperties.some(
    p => p === property && p !== currentProperty
  )

  if (isDuplicate) {
    return '属性名已存在'
  }

  return null
}
