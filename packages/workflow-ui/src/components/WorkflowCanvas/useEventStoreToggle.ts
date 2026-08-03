import { useCallback, useEffect, useState } from 'react'
import { globalRuntime } from '@sker/workflow'

/**
 * 事件存储开关 Hook
 *
 * 订阅全局 eventStream 的事件存储状态，并提供切换能力。
 * 事件存储开启后才会采集执行事件，供时间旅行调试器使用。
 */
export function useEventStoreToggle() {
  const [eventStoreEnabled, setEventStoreEnabled] = useState(false)

  // 订阅全局 eventStream 的事件存储状态
  useEffect(() => {
    const sub = globalRuntime.events.storeEnabled$.subscribe(enabled => {
      setEventStoreEnabled(enabled)
    })

    return () => sub.unsubscribe()
  }, [])

  // 切换事件存储开关
  const handleEventStoreToggle = useCallback((enabled: boolean) => {
    globalRuntime.events.setStoreEnabled(enabled)
  }, [])

  return { eventStoreEnabled, handleEventStoreToggle }
}
