import { useEffect, useCallback } from 'react';
import { Observable, Subscription } from 'rxjs';
import { NodeEvent } from '@sker/workflow';
import { useExecutionStore } from '../store/execution.store';

/**
 * 处理工作流流式执行的 Hook
 * 订阅后端的 NodeEvent 流并更新前端状态
 */
export function useStreamingExecution() {
  const { updateStreamingData, clearStreamingData, updateNodeState, updateNodeProgress, clearNodeProgress } = useExecutionStore();

  const subscribeToExecution = useCallback(
    (execution$: Observable<NodeEvent | NodeEvent[]>) => {
      const subscription: Subscription = execution$.subscribe({
        next: (events) => {
          const eventArray = Array.isArray(events) ? events : [events];

          eventArray.forEach((event) => {
            switch (event.type) {
              case 'node_delta':
                // 流式数据：实时更新累积文本
                if (event.data?.accumulated && event.data?.delta) {
                  updateStreamingData(event.id, event.data.delta, event.data.accumulated);
                }
                break;

              case 'node_progress':
                // 进度更新：工具调用、阶段性任务
                if (event.data?.stage && event.data?.message) {
                  updateNodeProgress(event.id, {
                    stage: event.data.stage,
                    message: event.data.message,
                    round: event.data.round,
                    status: event.data.status
                  });
                }
                break;

              case 'node_emit':
                // 节点完成：清除流式数据和进度
                clearStreamingData(event.id);
                clearNodeProgress(event.id);
                break;

              case 'node_success':
                // 节点成功：清除流式数据和进度
                clearStreamingData(event.id);
                clearNodeProgress(event.id);
                updateNodeState(event.id, 'success');
                break;

              case 'node_fail':
                // 节点失败：清除流式数据和进度
                clearStreamingData(event.id);
                clearNodeProgress(event.id);
                updateNodeState(event.id, 'fail');
                break;

              case 'node_runing':
                // 节点开始运行
                updateNodeState(event.id, 'running');
                break;
            }
          });
        },
        error: (error) => {
          console.error('[StreamingExecution] 执行失败:', error);
        },
        complete: () => {
          console.log('[StreamingExecution] 执行完成');
        },
      });

      return subscription;
    },
    [updateStreamingData, clearStreamingData, updateNodeState, updateNodeProgress, clearNodeProgress]
  );

  return { subscribeToExecution };
}

/**
 * 使用示例：
 *
 * ```tsx
 * const { subscribeToExecution } = useStreamingExecution();
 *
 * const handleExecute = () => {
 *   const execution$ = executeWorkflow(ast, { enableStreaming: true });
 *   const subscription = subscribeToExecution(execution$);
 *
 *   // 清理时取消订阅
 *   return () => subscription.unsubscribe();
 * };
 * ```
 */
