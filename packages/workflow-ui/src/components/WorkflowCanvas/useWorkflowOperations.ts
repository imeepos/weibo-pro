import React, { useCallback, useRef, useState } from 'react'
import { executeAstWithWorkflowGraph, executeNodeIsolated, executeAst, fromJson, toJson, type WorkflowGraphAst, getNodeById, type INode, type IAstStates, globalRuntime } from '@sker/workflow'
import type { useWorkflow } from '../../hooks/useWorkflow'
import type { ToastType } from './useCanvasState'
import { WorkflowController } from '@sker/sdk'
import { root } from '@sker/core'
import { Subject, takeUntil, finalize } from 'rxjs'
import { getExposedInputs, getExposedOutputs } from '../../utils/workflow-ports'
import { useExecutionStore } from '../../store/execution.store'

// ============================================================================
// 工具函数：提取重复逻辑，保持单一职责
// ============================================================================

function extractErrorInfo(error: unknown): { message: string; type?: string } {
  if (!error) return { message: '未知错误' }

  if (typeof error === 'object' && 'message' in error) {
    const err = error as any
    const deepError = err.cause ? extractDeepestError(err.cause) : err
    const rawMessage = deepError?.message || err.message || '执行失败'
    let message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage)

    if (message.includes('登录') || message.includes('LOGIN')) {
      return { message: '登录态已过期，需要更换账号', type: 'LOGIN_EXPIRED' }
    }
    return { message, type: err.type }
  }

  return { message: typeof error === 'string' ? error : String(error) }
}

function extractDeepestError(error: any): any {
  if (!error) return null
  return error.cause ? extractDeepestError(error.cause) : error
}

/** 从 metadata 收集属性更新 */
function collectPropertyUpdates(
  metadata: { property: string | symbol }[] | undefined,
  source: Record<string, any>
): Record<string, any> {
  const updates: Record<string, any> = {}
  metadata?.forEach((item: any) => {
    const propKey = String(item.property)
    if (source[propKey] !== undefined) {
      updates[propKey] = source[propKey]
    }
  })
  return updates
}

/** 合并节点状态 */
function mergeNodeState(originalNode: INode, updatedNode: any): INode {
  const inputUpdates = collectPropertyUpdates(originalNode.metadata?.inputs, updatedNode)
  const outputUpdates = collectPropertyUpdates(originalNode.metadata?.outputs, updatedNode)

  return Object.assign(
    Object.create(Object.getPrototypeOf(originalNode)),
    originalNode,
    {
      state: updatedNode.state,
      error: updatedNode.error,
      count: updatedNode.count,
      emitCount: updatedNode.emitCount,
      ...inputUpdates,
      ...outputUpdates
    }
  )
}

/** 追踪节点执行状态 */
function trackNodeExecution(
  originalNode: INode,
  updatedNode: any,
  nodeRecordIds: React.MutableRefObject<Map<string, string>>,
  recordNodeStart: (nodeId: string) => string,
  recordNodeComplete: (nodeId: string, recordId: string, status: IAstStates, error?: { message: string }, outputs?: Record<string, unknown>) => void
) {
  if (updatedNode.state === 'running' && !nodeRecordIds.current.has(updatedNode.id)) {
    nodeRecordIds.current.set(updatedNode.id, recordNodeStart(updatedNode.id))
  } else if ((updatedNode.state === 'success' || updatedNode.state === 'fail') && nodeRecordIds.current.has(updatedNode.id)) {
    const outputs = collectPropertyUpdates(originalNode.metadata?.outputs, updatedNode)
    recordNodeComplete(
      updatedNode.id,
      nodeRecordIds.current.get(updatedNode.id)!,
      updatedNode.state,
      updatedNode.error ? { message: String(updatedNode.error.message || updatedNode.error) } : undefined,
      Object.keys(outputs).length > 0 ? outputs : undefined
    )
    nodeRecordIds.current.delete(updatedNode.id)
  }
}

/**
 * 重置有入边连接的输入属性为默认值
 *
 * 设计理由：
 * - 只重置有入边的输入属性，保留用户手动配置的值
 * - 确保上一次运行的结果不会影响当前运行
 * - 使用 metadata.inputs 中的 defaultValue 作为重置值
 */
function resetConnectedInputs(workflowAst: WorkflowGraphAst): void {
  const { nodes, edges } = workflowAst

  // 收集每个节点有入边连接的输入属性
  const connectedInputs = new Map<string, Set<string>>()

  for (const edge of edges) {
    const targetNodeId = edge.to
    const targetProperty = edge.toProperty

    if (targetProperty) {
      if (!connectedInputs.has(targetNodeId)) {
        connectedInputs.set(targetNodeId, new Set())
      }
      connectedInputs.get(targetNodeId)!.add(targetProperty)
    }
  }

  // 重置有入边连接的输入属性
  for (const node of nodes) {
    const nodeConnectedInputs = connectedInputs.get(node.id)
    if (!nodeConnectedInputs || nodeConnectedInputs.size === 0) continue

    const nodeInputs = node.metadata?.inputs || []
    for (const inputMeta of nodeInputs) {
      const property = String(inputMeta.property)

      // 只重置有入边连接的属性
      if (nodeConnectedInputs.has(property)) {
        const defaultValue = inputMeta.defaultValue
        if (defaultValue !== undefined) {
          // 深拷贝默认值避免引用类型污染
          (node as any)[property] = JSON.parse(JSON.stringify(defaultValue))
        } else {
          // 没有 defaultValue 时，根据类型设置合理默认值
          (node as any)[property] = Array.isArray((node as any)[property]) ? [] : undefined
        }
      }
    }
  }
}

export function useWorkflowOperations(
  workflow: ReturnType<typeof useWorkflow>,
  callbacks?: {
    onShowToast?: (type: ToastType, title: string, message?: string) => void
    onSetRunning?: (running: boolean) => void
    onSetSaving?: (saving: boolean) => void
    getViewport?: () => { x: number; y: number; zoom: number }
  }
) {
  const { onShowToast, onSetRunning, onSetSaving, getViewport } = callbacks || {}

  // 取消 Subject：当需要取消时，emit 一个值，通过 takeUntil 自动完成流
  const cancelSubject$ = useRef(new Subject<void>())
  const abortControllerRef = useRef<AbortController | null>(null)
  // 追踪节点执行记录 ID（nodeId -> recordId）
  const nodeRecordIds = useRef<Map<string, string>>(new Map())
  // 工作流执行锁，防止重复执行（使用 ref 而非 state，避免触发重渲染）
  const isWorkflowRunningRef = useRef(false)

  const { recordNodeStart, recordNodeComplete } = useExecutionStore.getState()

  /**
   * 运行单个节点
   *
   * 优雅设计：
   * - 直接调用 executeAst，装饰器系统自动查找 Handler
   * - 利用 Observable 流式特性，实时更新节点状态
   * - 每次 next 事件触发状态同步，提供流畅执行体验
   * - 执行前后自动保存状态，确保数据持久化
   */
  const runNode = useCallback(
    async (nodeId: string) => {
      if (!workflow.workflowAst) {
        console.error(`工作流 AST 不存在`)
        onShowToast?.('error', '工作流 AST 不存在')
        return
      }

      const targetNode = getNodeById(workflow.workflowAst.nodes, nodeId)
      if (!targetNode) {
        console.error(`节点不存在`)
        onShowToast?.('error', '节点不存在', `节点ID: ${nodeId}`)
        return
      }

      // 执行前保存状态
      try {
        if (getViewport) {
          workflow.workflowAst.viewport = getViewport()
        }
        const controller = root.get<WorkflowController>(WorkflowController)
        await controller.saveWorkflow(workflow.workflowAst)
      } catch (error: any) {
        console.error('执行前保存工作流失败:', error)
      }

      onSetRunning?.(true)

      // ✨ 深拷贝 AST：避免 Zustand + Immer 冻结对象导致的只读属性问题
      // 调度器需要可变对象来实时更新节点状态
      const mutableAst = fromJson<WorkflowGraphAst>(
        JSON.parse(JSON.stringify(toJson(workflow.workflowAst)))
      )

      // executeAst 返回 Observable，利用流式特性实时更新状态
      // finalize 确保无论如何结束都会重置状态
      const subscription = executeAstWithWorkflowGraph(targetNode, {}, mutableAst)
        .pipe(
          finalize(() => {
            // 确保在所有情况下都重置运行状态
            onSetRunning?.(false)
          })
        )
        .subscribe({
          next: (event) => {
            if (event.type !== 'node_success' && event.type !== 'node_fail') return

            // 从 mutableAst 中获取更新后的节点
            const updatedNode = getNodeById(mutableAst.nodes, event.id)
            if (!updatedNode) return

            workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
              if (originalNode.id !== updatedNode.id) return originalNode

              // 记录节点执行历史
              trackNodeExecution(originalNode, updatedNode, nodeRecordIds, recordNodeStart, recordNodeComplete)

              return mergeNodeState(originalNode, updatedNode)
            })
            workflow.syncFromAst()
          },
          error: async (error) => {
            const errorInfo = extractErrorInfo(error)
            nodeRecordIds.current.forEach((recordId, nId) => {
              recordNodeComplete(nId, recordId, 'fail', { message: errorInfo.message })
            })
            nodeRecordIds.current.clear()
            console.error(`工作流执行异常`)
            onShowToast?.('error', '工作流执行异常', errorInfo.message)

            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (saveError: any) {
              console.error('执行失败后保存工作流失败:', saveError)
            }
          },
          complete: async () => {
            workflow.syncFromAst()

            const successCount = workflow.workflowAst!.nodes.filter(n => n.state === 'success').length
            const failCount = workflow.workflowAst!.nodes.filter(n => n.state === 'fail').length

            if (failCount === 0) {
              onShowToast?.('success', '工作流执行成功', `共执行 ${successCount} 个节点`)
            } else if (successCount > 0) {
              onShowToast?.('error', '工作流部分失败', `成功: ${successCount}, 失败: ${failCount}`)
            } else {
              onShowToast?.('error', '工作流执行失败', `所有节点均失败`)
            }

            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (error: any) {
              console.error('执行完成后保存工作流失败:', error)
            }
          }
        })

      return () => subscription.unsubscribe()
    },
    [workflow, onShowToast, onSetRunning, getViewport]
  )

  const runNodeIsolated = useCallback(
    async (nodeId: string) => {
      if (!workflow.workflowAst) {
        console.error(`工作流 AST 不存在`)
        onShowToast?.('error', '工作流 AST 不存在')
        return
      }

      const targetNode = getNodeById(workflow.workflowAst.nodes, nodeId)
      if (!targetNode) {
        console.error(`节点不存在`)
        onShowToast?.('error', '节点不存在', `节点ID: ${nodeId}`)
        return
      }

      try {
        if (getViewport) {
          workflow.workflowAst.viewport = getViewport()
        }
        const controller = root.get<WorkflowController>(WorkflowController)
        await controller.saveWorkflow(workflow.workflowAst)
      } catch (error: any) {
        console.error('执行前保存工作流失败:', error)
      }

      onSetRunning?.(true)

      const mutableAst = fromJson<WorkflowGraphAst>(
        JSON.parse(JSON.stringify(toJson(workflow.workflowAst)))
      )

      const subscription = executeNodeIsolated(targetNode, mutableAst)
        .pipe(
          finalize(() => {
            onSetRunning?.(false)
          })
        )
        .subscribe({
          next: (event) => {
            if (event.type !== 'node_success' && event.type !== 'node_fail') return

            // 从 mutableAst 中获取更新后的状态
            workflow.workflowAst!.state = mutableAst.state
            workflow.workflowAst!.error = mutableAst.error

            // 从 mutableAst 中同步所有节点状态
            workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
              const updatedNode = getNodeById(mutableAst.nodes, originalNode.id)
              if (!updatedNode) return originalNode

              trackNodeExecution(originalNode, updatedNode, nodeRecordIds, recordNodeStart, recordNodeComplete)
              return mergeNodeState(originalNode, updatedNode)
            })
            workflow.syncFromAst()
          },
          error: async (error) => {
            const errorInfo = extractErrorInfo(error)
            nodeRecordIds.current.forEach((recordId, nId) => {
              recordNodeComplete(nId, recordId, 'fail', { message: errorInfo.message })
            })
            nodeRecordIds.current.clear()
            console.error('节点执行异常')
            onShowToast?.('error', '节点执行异常', errorInfo.message)

            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (saveError: any) {
              console.error('执行失败后保存工作流失败:', saveError)
            }
          },
          complete: async () => {
            workflow.syncFromAst()

            const nodeState = getNodeById(workflow.workflowAst!.nodes, nodeId)?.state
            if (nodeState === 'success') {
              onShowToast?.('success', '节点执行成功', '该节点已完成执行')
            } else if (nodeState === 'fail') {
              onShowToast?.('error', '节点执行失败', '请检查节点配置和输入数据')
            }

            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (error: any) {
              console.error('执行完成后保存工作流失败:', error)
            }
          }
        })

      return () => subscription.unsubscribe()
    },
    [workflow, onShowToast, onSetRunning, getViewport]
  )

  /**
   * 运行整个工作流
   *
   * 优雅设计：
   * - 利用 Observable + takeUntil 实现优雅的取消机制
   * - 通过 Subject emit 值来触发取消，符合响应式编程范式
   * - 执行前后自动保存状态，确保数据持久化
   * - 自动统计执行结果，提供清晰反馈
   * - 支持运行前配置输入参数，应用到对应节点
   * - 防止重复执行：使用 isWorkflowRunning 标志位
   */
  const runWorkflow = useCallback(
    async (inputs?: Record<string, unknown>, onComplete?: () => void) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '工作流不存在', '无法执行空工作流')
        return
      }

      const nodes = workflow.nodes
      if (nodes.length === 0) {
        onShowToast?.('info', '没有节点可执行', '请先添加节点到画布')
        return
      }

      // 防止重复执行
      if (isWorkflowRunningRef.current) {
        onShowToast?.('info', '工作流正在执行中', '请等待当前执行完成')
        return
      }
      isWorkflowRunningRef.current = true


      const cleanup = () => {
        isWorkflowRunningRef.current = false
      }

      try {
        // 如果有正在运行的工作流，先取消
        if (abortControllerRef.current) {
          cancelSubject$.current.next()

          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }

          onShowToast?.('info', '已取消上一次运行', '开始新的工作流执行')

          // 重置正在运行的节点状态（不可变方式），但保留输出字段
          workflow.workflowAst.nodes = workflow.workflowAst.nodes.map(node => {
            if (node.state === 'running') {
              // 保留输出字段
              const outputFields: Record<string, any> = {}
              node.metadata?.outputs?.forEach((output: any) => {
                if (node[output.property] !== undefined) {
                  outputFields[output.property] = node[output.property]
                }
              })

              return Object.assign(
                Object.create(Object.getPrototypeOf(node)),
                node,
                { state: 'pending', error: undefined, ...outputFields }
              )
            }
            return node
          })
          workflow.syncFromAst()
        }

        // 应用输入参数到对应节点
        console.log(`[runWorkflow] 接收到的 inputs:`, inputs)
        if (inputs && Object.keys(inputs).length > 0) {
          // 收集所有需要修改的节点更新（批量优化）
          const nodeUpdates = new Map<string, Record<string, any>>()

          Object.entries(inputs).forEach(([key, value]) => {
            // 跳过 undefined 值（保留节点默认值）
            if (value === undefined) {
              return
            }

            // key 格式: "nodeId.propertyKey"
            const dotIndex = key.indexOf('.')
            if (dotIndex === -1) {
              console.warn(`⚠️ 无效的输入键格式: ${key}`)
              return
            }

            const nodeId = key.substring(0, dotIndex)
            const propertyKey = key.substring(dotIndex + 1)

            if (!nodeUpdates.has(nodeId)) {
              nodeUpdates.set(nodeId, {})
            }
            nodeUpdates.get(nodeId)![propertyKey] = value
          })

          // 批量更新节点（不可变方式，避免修改只读对象）
          workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(node => {
            const updates = nodeUpdates.get(node.id)
            if (updates) {
              // 创建新节点对象，保持原型链
              return Object.assign(
                Object.create(Object.getPrototypeOf(node)),
                node,
                updates
              )
            }
            return node
          })

          // 同步到 React Flow
          workflow.syncFromAst()
        }

        // 执行前保存状态
        try {
          if (getViewport) {
            workflow.workflowAst.viewport = getViewport()
          }
          const controller = root.get<WorkflowController>(WorkflowController)
          await controller.saveWorkflow(workflow.workflowAst)
        } catch (error: any) {
          console.error('[runWorkflow] 执行前保存工作流失败:', error)
        }

        // 创建新的取消 Subject（重置上一次的）
        cancelSubject$.current = new Subject<void>()

        // 创建新的 AbortController
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        // ✨ 重置有入边连接的输入属性，防止上一次运行结果影响当前运行
        resetConnectedInputs(workflow.workflowAst)

        // ✨ 重置所有节点状态为 pending（参考 reactive-scheduler.ts 的 resetWorkflowGraphAst）
        // 确保进度条从 0% 开始，但保留输出字段数据
        workflow.workflowAst.state = 'pending'
        workflow.workflowAst.nodes = workflow.workflowAst.nodes.map(node => {
          // 保留输出字段（qrcode, account, message 等）
          const outputFields: Record<string, any> = {}
          node.metadata?.outputs?.forEach((output: any) => {
            if (node[output.property] !== undefined) {
              outputFields[output.property] = node[output.property]
            }
          })

          return Object.assign(
            Object.create(Object.getPrototypeOf(node)),
            node,
            {
              state: 'pending',
              count: 0,
              emitCount: 0,
              error: undefined,
              ...outputFields
            }
          )
        })
        workflow.syncFromAst()

        // 🎬 开始录制事件（清空历史，开启存储）
        globalRuntime.startRecording()

        onSetRunning?.(true)

        // ✨ 深拷贝 AST：避免 Zustand + Immer 冻结对象导致的只读属性问题
        // 调度器需要可变对象来实时更新节点状态
        const mutableAst = fromJson<WorkflowGraphAst>(
          JSON.parse(JSON.stringify(toJson(workflow.workflowAst)))
        )

        // 将 abortSignal 附加到工作流上下文
        mutableAst.abortSignal = abortController.signal

        // executeAst 返回 Observable，使用 takeUntil 监听取消信号
        // finalize 确保无论如何结束（完成、错误、取消）都会重置状态
        const subscription = executeAst(mutableAst, inputs || {}, mutableAst)
          .pipe(
            takeUntil(cancelSubject$.current),
            finalize(() => {
              // 确保在所有情况下都重置运行状态和控制器引用
              abortControllerRef.current = null
              onSetRunning?.(false)
              // isWorkflowRunning 在各个完成路径中单独处理
            })
          )
          .subscribe({
            next: (event) => {
              // 处理所有节点事件，包括 running 状态
              if (event.type === 'node_success') {
                workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
                  if (originalNode.id === event.id) {
                    return Object.assign(
                      Object.create(Object.getPrototypeOf(originalNode)),
                      originalNode,
                      { state: 'success' }
                    )
                  }
                  return originalNode
                })
                workflow.syncFromAst()
              } else if (event.type === 'node_fail') {
                workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
                  if (originalNode.id === event.id) {
                    return Object.assign(
                      Object.create(Object.getPrototypeOf(originalNode)),
                      originalNode,
                      { state: 'fail', error: event.error }
                    )
                  }
                  return originalNode
                })
                workflow.syncFromAst()
              } else if (event.type === 'node_runing') {
                // 处理节点运行状态
                workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
                  if (originalNode.id === event.id) {
                    return Object.assign(
                      Object.create(Object.getPrototypeOf(originalNode)),
                      originalNode,
                      { state: 'running' }
                    )
                  }
                  return originalNode
                })
                workflow.syncFromAst()
              } else if (event.type === 'node_emit') {
                // 处理属性实时更新（qrcode, message, account 等）
                let found = false
                workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
                  if (originalNode.id === event.id) {
                    found = true
                    return Object.assign(
                      Object.create(Object.getPrototypeOf(originalNode)),
                      originalNode,
                      event.data
                    )
                  }
                  return originalNode
                })

                if (!found) {
                  console.warn(`[runWorkflow] 未找到节点 ${event.id}，无法更新属性`)
                }

                workflow.syncFromAst()
              } else if (event.type === 'node_progress') {
                // 处理节点进度事件（工具调用、阶段性任务）
                workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
                  if (originalNode.id === event.id) {
                    // 保持 running 状态，只更新进度信息
                    return Object.assign(
                      Object.create(Object.getPrototypeOf(originalNode)),
                      originalNode,
                      {
                        progress: (event as any).data,
                        state: originalNode.state || 'running' // 确保状态为 running
                      }
                    )
                  }
                  return originalNode
                })

                workflow.syncFromAst()
              } else if (event.type === 'node_delta') {
                // 处理节点增量输出（流式数据）
                console.log(`[runWorkflow] node_delta 事件: nodeId=${event.id}`)

                workflow.workflowAst!.nodes = workflow.workflowAst!.nodes.map(originalNode => {
                  if (originalNode.id === event.id) {
                    const deltaData = (event as any).data
                    // 累积流式数据
                    return Object.assign(
                      Object.create(Object.getPrototypeOf(originalNode)),
                      originalNode,
                      {
                        delta: deltaData.delta,
                        accumulated: deltaData.accumulated,
                        state: originalNode.state || 'running' // 确保状态为 running
                      }
                    )
                  }
                  return originalNode
                })

                workflow.syncFromAst()
              }
            },
            error: async (error) => {
              console.error('[runWorkflow] 执行出错:', error)
              const errorInfo = extractErrorInfo(error)

              // 完成所有正在运行的节点记录
              nodeRecordIds.current.forEach((recordId, nodeId) => {
                recordNodeComplete(nodeId, recordId, 'fail', { message: errorInfo.message })
              })
              nodeRecordIds.current.clear()

              // 检查是否是取消导致的错误
              if (error?.name === 'AbortError' || errorInfo.message.includes('取消')) {
                onShowToast?.('info', '工作流已取消', '用户主动取消执行')
              } else {
                console.error('工作流执行异常:', error)
                onShowToast?.('error', '工作流执行异常', errorInfo.message)
              }

              cleanup()

              // 执行失败后保存状态
              try {
                if (getViewport) {
                  workflow.workflowAst!.viewport = getViewport()
                }
                const controller = root.get<WorkflowController>(WorkflowController)
                await controller.saveWorkflow(workflow.workflowAst!)
              } catch (saveError: any) {
                console.error('[runWorkflow] 执行失败后保存工作流失败:', saveError)
              }
            },
            complete: async () => {
              // 确保最终状态同步到 UI
              workflow.syncFromAst()

              // 调试：检查节点状态

              // 统计执行结果
              const successCount = workflow.workflowAst!.nodes.filter(n => n.state === 'success').length
              const failCount = workflow.workflowAst!.nodes.filter(n => n.state === 'fail').length


              if (failCount === 0) {
                onShowToast?.('success', '工作流执行成功', `共执行 ${successCount} 个节点`)
              } else if (successCount > 0) {
                onShowToast?.('error', '工作流部分失败', `成功: ${successCount}, 失败: ${failCount}`)
              } else {
                onShowToast?.('error', '工作流执行失败', `所有节点均失败`)
              }

              cleanup()

              // 执行完成后保存状态
              try {
                if (getViewport) {
                  workflow.workflowAst!.viewport = getViewport()
                }
                const controller = root.get<WorkflowController>(WorkflowController)
                await controller.saveWorkflow(workflow.workflowAst!)
              } catch (error: any) {
                console.error('[runWorkflow] 执行完成后保存工作流失败:', error)
              }

              onComplete?.()
            }
          })

        // 返回取消函数，便于外部管理
        return () => {
          cancelSubject$.current.next()
          abortController.abort()
          abortControllerRef.current = null
          subscription.unsubscribe();
        }
      } catch (error) {
        console.error('[runWorkflow] 执行过程中发生异常:', error)
        cleanup()
        throw error
      }
    },
    [workflow, onShowToast, onSetRunning, getViewport]
  )

  /**
   * 保存工作流
   */
  const saveWorkflow = useCallback(
    async (name: string, onComplete?: () => void) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '保存失败', '工作流不存在')
        return
      }

      onSetSaving?.(true)

      try {
        if (getViewport) {
          workflow.workflowAst.viewport = getViewport()
        }

        const controller = root.get<WorkflowController>(WorkflowController)
        workflow.workflowAst.name = name;
        await controller.saveWorkflow(workflow.workflowAst)

        onShowToast?.('success', '保存成功', '工作流已保存')
        onComplete?.()
      } catch (error: any) {
        onShowToast?.('error', '保存失败', error.message || '未知错误')
      } finally {
        onSetSaving?.(false)
      }
    },
    [workflow, onShowToast, onSetSaving, getViewport]
  )

  /**
   * 取消工作流执行
   *
   * 优雅设计：
   * - 通过 Subject.next() 触发 takeUntil，让 Observable 流自动完成
   * - 符合响应式编程范式，比直接 unsubscribe 更优雅
   * - 同时触发 AbortSignal 用于取消异步操作
   */
  const cancelWorkflow = useCallback(() => {
    if (!abortControllerRef.current) {
      onShowToast?.('info', '没有正在运行的工作流', '当前没有需要取消的任务')
      return
    }

    // 触发取消信号：通过 Subject emit 值，takeUntil 会自动完成流
    cancelSubject$.current.next()

    // 触发 AbortSignal
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // 重置正在运行的节点状态（不可变方式），但保留输出字段
    if (workflow.workflowAst) {
      workflow.workflowAst.nodes = workflow.workflowAst.nodes.map(node => {
        if (node.state === 'running') {
          // 保留输出字段
          const outputFields: Record<string, any> = {}
          node.metadata?.outputs?.forEach((output: any) => {
            if (node[output.property] !== undefined) {
              outputFields[output.property] = node[output.property]
            }
          })

          return Object.assign(
            Object.create(Object.getPrototypeOf(node)),
            node,
            { state: 'pending', error: undefined, ...outputFields }
          )
        }
        return node
      })
      workflow.syncFromAst()
    }

    onSetRunning?.(false)
    onShowToast?.('info', '工作流已取消', '已停止执行')

    // 重置执行标志
    isWorkflowRunningRef.current = false
  }, [workflow, onSetRunning, onShowToast])

  /**
   * 保存子工作流
   *
   * 优雅设计：
   * - 更新父节点中的子工作流数据
   * - 动态重新生成 metadata，反映最新的端口结构
   * - 通过 syncFromAst 强制重新生成所有节点，触发 React 更新
   * - 返回父节点 ID，通知调用者刷新节点端口
   */
  const saveSubWorkflow = useCallback(
    (parentNodeId: string, updatedAst: WorkflowGraphAst, onComplete?: () => void) => {
      if (!workflow.workflowAst) {
        onShowToast?.('error', '保存失败', '父工作流不存在')
        return
      }

      try {
        const parentNode = getNodeById(workflow.workflowAst.nodes, parentNodeId)

        if (parentNode && parentNode.type === 'WorkflowGraphAst') {
          // 更新子工作流数据
          parentNode.nodes = [...updatedAst.nodes]
          parentNode.edges = [...updatedAst.edges]
          parentNode.name = updatedAst.name
          parentNode.description = updatedAst.description
          parentNode.viewport = updatedAst.viewport ? { ...updatedAst.viewport } : undefined

          // 动态生成 metadata - 反映子工作流的实际端口结构
          // 存在即合理：WorkflowGraphAst 的端口由内部节点决定，保存时必须重新计算
          if (parentNode.metadata) {
            // 计算暴露的输入端口
            const exposedInputs = getExposedInputs(parentNode)
            parentNode.metadata.inputs = exposedInputs.map((input) => {
              // 查找原始节点的 metadata，保留所有字段
              const originNode = parentNode.nodes?.find((n: any) => n.id === input.nodeId)
              const originInputMeta = originNode?.metadata?.inputs.find(
                (m: any) => String(m.property) === input.property
              )

              return {
                property: `${input.nodeId}.${input.property}`,
                type: input.type as any,
                title: input.title || input.property,
                required: input.required,
                mode: originInputMeta?.mode,
                defaultValue: originInputMeta?.defaultValue
              }
            })

            // 计算暴露的输出端口
            const exposedOutputs = getExposedOutputs(parentNode)
            parentNode.metadata.outputs = exposedOutputs.map((output) => {
              // 查找原始节点的 metadata，保留所有字段
              const originNode = parentNode.nodes?.find((n: any) => n.id === output.nodeId)
              const originOutputMeta = originNode?.metadata?.outputs.find(
                (m: any) => String(m.property) === output.property
              )

              return {
                property: `${output.nodeId}.${output.property}`,
                type: output.type,
                title: output.title || output.property,
                isRouter: originOutputMeta?.isRouter,
                dynamic: originOutputMeta?.dynamic,
                condition: originOutputMeta?.condition
              }
            })
          }

          // 强制同步到 React Flow，完全重新生成节点数组
          // 这会创建新的 Flow 节点对象，触发 React 重新渲染
          workflow.syncFromAst()

          onShowToast?.('success', '子工作流已保存', '更改已同步到父工作流')
          onComplete?.()

          // 返回父节点 ID
          return parentNodeId
        } else {
          onShowToast?.('error', '保存失败', '无法找到对应的子工作流节点')
        }
      } catch (error) {
        onShowToast?.('error', '保存失败', '无法更新子工作流')
      }
    },
    [workflow, onShowToast]
  )

  // 使用 useRef 存储 cancel 函数，避免 useEffect cleanup 频繁触发
  const cancelWorkflowRef = useRef(cancelWorkflow)
  React.useEffect(() => {
    cancelWorkflowRef.current = cancelWorkflow
  }, [cancelWorkflow])

  // 页面生命周期监听：处理路由切换、刷新、关闭等情况
  React.useEffect(() => {
    // 监听页面卸载（刷新、关闭浏览器）
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isWorkflowRunningRef.current) {
        // 提示用户有正在运行的工作流
        const message = '有工作流正在执行中，离开页面将取消执行。'
        event.returnValue = message
        return message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // 组件卸载时（路由切换）自动取消工作流
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // 路由切换时，如果有正在运行的工作流，自动取消
      if (isWorkflowRunningRef.current) {
        cancelWorkflowRef.current()
      }
    }
  }, []) // 空依赖数组，只在组件挂载/卸载时执行

  return {
    runNode,
    runNodeIsolated,
    runWorkflow,
    cancelWorkflow,
    saveWorkflow,
    saveSubWorkflow,
  }
}
