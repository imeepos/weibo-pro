import { useEffect } from 'react'
import { useTimeTravel } from '../../hooks/useTimeTravel'
import type { UseWorkflowReturn } from '../../hooks/useWorkflow'

/**
 * 画布时间旅行 Hook
 *
 * 负责时间旅行状态以及「节点状态时间切片渲染」的订阅逻辑：
 * 订阅 nodeStates$，实时更新节点状态。
 * 只更新有事件的节点，避免干扰其他节点的状态。
 */
export function useCanvasTimeTravel(workflow: Pick<UseWorkflowReturn, 'setNodes'>) {
  const timeTravel = useTimeTravel()

  // 节点状态时间切片渲染（时间旅行核心逻辑）
  useEffect(() => {
    const sub = timeTravel.eventStream.nodeStates$.subscribe(nodeStates => {
      if (nodeStates.size === 0) return

      // 批量更新节点状态 - 只更新有事件的节点
      workflow.setNodes(prevNodes =>
        prevNodes.map(node => {
          const event = nodeStates.get(node.id)

          if (!event) {
            // 没有事件的节点保持原状态不变
            return node
          }

          // 根据事件类型更新节点状态
          let newState: 'pending' | 'running' | 'success' | 'fail' = 'pending'

          if (event.type === 'node_success') {
            newState = 'success'
          } else if (event.type === 'node_fail') {
            newState = 'fail'
          } else if (event.type === 'node_runing') {
            newState = 'running'
          } else if (event.type === 'node_emit') {
            newState = 'running' // 发射数据时也显示为运行中
          }

          // 不可变更新节点数据
          return {
            ...node,
            data: {
              ...node.data,
              state: newState,
            },
          }
        })
      )
    })

    return () => sub.unsubscribe()
  }, [timeTravel.eventStream, workflow.setNodes])

  return timeTravel
}
