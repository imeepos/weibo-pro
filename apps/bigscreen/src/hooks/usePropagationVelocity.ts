import { useState, useEffect } from 'react'
import type { PropagationVelocity } from '@sker/sdk'

/**
 * 传播速度指数 Hook
 *
 * 获取并管理事件的传播速度数据
 */
export const usePropagationVelocity = (eventId: string) => {
  const [data, setData] = useState<PropagationVelocity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!eventId) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // 调用 API 获取传播速度数据
        const response = await fetch(`/api/events/${eventId}/propagation/velocity`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err as Error)
        console.error('Failed to fetch propagation velocity:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [eventId])

  return { data, loading, error, refetch: () => fetchData() }
}

// 内部辅助函数
function fetchData() {
  // 这个函数会在 useEffect 内部定义
  throw new Error('Function called outside of useEffect')
}
