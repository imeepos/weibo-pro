import { useEffect, useState } from 'react'

/**
 * 画布环境状态 Hook
 *
 * 负责追踪与画布渲染环境相关的全局状态：
 * - 明暗主题：通过 MutationObserver 监听 <html> 的 class 变化
 * - 全局鼠标位置：始终追踪最新位置，用于智能粘贴定位
 */
export function useCanvasEnvironment() {
  // 主题检测
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  // 鼠标位置追踪（用于智能粘贴）
  const [lastMousePosition, setLastMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // 全局鼠标移动监听（确保始终追踪到最新位置）
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      setLastMousePosition({
        x: event.clientX,
        y: event.clientY
      })
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove)
  }, [])

  // 监听主题变化
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  return { isDark, lastMousePosition }
}
