import { Observable } from 'rxjs';
import { WorkflowGraphAst, setAstError } from '../ast';
import { NodeEvent } from './events';
import { Injectable } from '@sker/core';
import { ExecutionContext } from './ExecutionContext';

/**
 * 工作流事件合并器
 *
 * 职责：
 * - 合并所有节点事件流
 * - 管理工作流状态（running → success/fail）
 * - 监听子节点完成状态
 * - 使用 ExecutionContext 隔离并发执行的状态
 */
@Injectable()
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
     *
     * @param workflow 工作流 AST
     * @param nodeEventStreams 节点事件流映射
     * @param ctx 执行上下文（可选，用于状态隔离）
     */
    mergeNodeEventStreams(
        workflow: WorkflowGraphAst,
        nodeEventStreams: Map<string, Observable<NodeEvent>>,
        ctx?: ExecutionContext
    ): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            obs.next({ type: 'node_runing', id: workflow.id });

            const allStreams = Array.from(nodeEventStreams.values());
            if (allStreams.length === 0) {
                // 使用上下文存储状态
                if (ctx) {
                    ctx.getNodeState(workflow.id).state = 'success';
                }
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
                            // 更新上下文中的节点状态
                            if (ctx) {
                                const nodeState = ctx.getNodeState(event.id!);
                                nodeState.state = 'fail';
                                if (event.error) {
                                    nodeState.error = { message: event.error };
                                }
                            }
                            if (event.error && !workflow.error) {
                                setAstError(workflow, new Error(event.error));
                                if (ctx) {
                                    ctx.getNodeState(workflow.id).error = { message: event.error };
                                }
                            }
                        } else if (event.type === 'node_success') {
                            nodeStates.set(event.id!, 'success');
                            // 更新上下文中的节点状态
                            if (ctx) {
                                ctx.getNodeState(event.id!).state = 'success';
                            }
                        }
                    },
                    error: err => {
                        // 节点错误不中断工作流，记录错误后继续
                        nodeStates.set(workflow.id, 'fail');
                        workflow.state = 'fail';
                        workflow.error = err;
                        setAstError(workflow, err);
                        // 更新上下文状态
                        if (ctx) {
                            const workflowState = ctx.getNodeState(workflow.id);
                            workflowState.state = 'fail';
                            workflowState.error = err;
                        }
                        obs.next({ type: 'node_fail', id: workflow.id, error: workflow.error?.message });
                        // 不调用 obs.error，让其他节点继续执行
                    },
                    complete: () => {
                        completedCount++;
                        if (completedCount === totalNodes) {
                            const hasError = Array.from(nodeStates.values()).some(s => s === 'fail');
                            const finalState = hasError ? 'fail' : 'success';
                            workflow.state = finalState;
                            // 更新上下文状态
                            if (ctx) {
                                ctx.getNodeState(workflow.id).state = finalState;
                            }
                            if (hasError) {
                                const error = workflow.error || new Error('Workflow failed');
                                if (ctx && !ctx.getNodeState(workflow.id).error) {
                                    ctx.getNodeState(workflow.id).error = { message: error.message };
                                }
                                obs.next({ type: 'node_fail', id: workflow.id, error: error.message });
                                // 改为 complete 而不是 error，让工作流正常结束
                                obs.complete();
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
