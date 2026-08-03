import { useRef, useEffect } from 'react'
import type { INode } from '@sker/workflow'

/**
 * Hook：监听 AST 节点深度变更
 *
 * 使用场景：
 * - 节点配置表单变更
 * - 状态更新（success/error）
 * - 动态属性修改
 *
 * 工作原理：
 * 使用 React 的渲染机制作为变更检测器。
 * 当依赖项变化时（虽然依赖数组为空，但闭包中的值会发生变化），
 * 我们检查 paths 中的值是否真正发生了变更。
 *
 * 虽然这不是最精确的方式（每次渲染都执行检查），
 * 但在大多数场景下足够高效，且避免了使用 Proxy 带来的复杂性。
 *
 * @param node - AST 节点
 * @param paths - 需要监听的属性路径数组
 * @param onChange - 变更回调
 *
 * @example
 * ```typescript
 * useDeepSync(node, ['config.value', 'state'], () => {
 *   // 配置或状态变更时触发
 *   syncToReactFlow()
 * })
 * ```
 */
export function useDeepSync<T extends INode>(
  node: T,
  paths: string[],
  onChange: () => void
): void {
  // 使用 ref 存储上一次的值，避免重复触发
  const previousValuesRef = useRef<Record<string, any>>({})

  useEffect(() => {
    // 检查每个路径的值是否真正发生了变更
    let hasChanged = false

    paths.forEach((path) => {
      const currentValue = getNestedValue(node, path)
      const previousValue = previousValuesRef.current[path]

      // 值发生变化
      if (currentValue !== previousValue) {
        hasChanged = true
        previousValuesRef.current[path] = currentValue
      }
    })

    // 如果有任何路径的值发生变更，触发回调
    if (hasChanged) {
      onChange()
    }
  })
  // 注意：依赖数组为空，每次渲染都执行
  // 但通过值比较确保只有真正变更时才触发回调
}

/**
 * 获取嵌套对象的值
 * @param obj - 对象
 * @param path - 路径（如 'config.value'）
 * @returns 值
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
