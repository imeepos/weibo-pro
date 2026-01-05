import { Observable } from 'rxjs';
import { WorkflowGraphAst, setAstError } from '../ast';
import { NodeEvent } from './events';

/**
 * 工作流事件合并器
 *
 * 职责：
 * - 合并所有节点事件流
 * - 管理工作流状态（running → success/fail）
 * - 监听子节点完成状态
 */
export class WorkflowEventMerger {
    /**
     * 合并所有节点事件流，管理工作流状态
     *
     * 逻辑：
     * 1. 发射 node_runing 事件
     * 2. 订阅所有节点事件流
     * 3. 转发所有节点事件
     * 4. 记录节点成功/失败状态
     * 5. 当所有节点完成时，决定工作流最终状态
     */
    mergeNodeEventStreams(
        workflow: WorkflowGraphAst,
        nodeEventStreams: Map<string, Observable<NodeEvent>>
    ): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            obs.next({ type: 'node_runing', id: workflow.id });

            const allStreams = Array.from(nodeEventStreams.values());
            if (allStreams.length === 0) {
                workflow.state = 'success';
                obs.next({ type: 'node_success', id: workflow.id });
                obs.complete();
                return;
            }

            let completedCount = 0;
            const totalNodes = allStreams.length;
            const nodeStates = new Map<string, 'success' | 'fail'>();
            const subscriptions: any[] = [];

            allStreams.forEach(nodeStream => {
                const sub = nodeStream.subscribe({
                    next: event => {
                        obs.next(event);
                        if (event.type === 'node_fail') {
                            nodeStates.set(event.id!, 'fail');
                            if (event.error && !workflow.error) {
                                setAstError(workflow, new Error(event.error));
                            }
                        } else if (event.type === 'node_success') {
                            nodeStates.set(event.id!, 'success');
                        }
                    },
                    error: err => {
                        workflow.state = 'fail';
                        workflow.error = err;
                        setAstError(workflow, err);
                        obs.next({ type: 'node_fail', id: workflow.id, error: workflow.error?.message });
                        subscriptions.forEach(sub => sub.unsubscribe());
                        obs.error(err);
                    },
                    complete: () => {
                        completedCount++;
                        if (completedCount === totalNodes) {
                            const hasError = Array.from(nodeStates.values()).some(s => s === 'fail');
                            workflow.state = hasError ? 'fail' : 'success';
                            if (hasError) {
                                const error = workflow.error || new Error('Workflow failed');
                                obs.next({ type: 'node_fail', id: workflow.id, error: error.message });
                                obs.error(error);
                            } else {
                                obs.next({ type: 'node_success', id: workflow.id });
                                obs.complete();
                            }
                        }
                    }
                });
                subscriptions.push(sub);
            });

            return () => subscriptions.forEach(sub => sub.unsubscribe());
        });
    }
}
