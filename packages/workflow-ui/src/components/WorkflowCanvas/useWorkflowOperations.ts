import { useCallback, useRef } from 'react'
import { executeAstWithWorkflowGraph, executeNodeIsolated, executeAst, fromJson, toJson, type WorkflowGraphAst, getNodeById } from '@sker/workflow'
import type { useWorkflow } from '../../hooks/useWorkflow'
import type { ToastType } from './useCanvasState'
import { WorkflowController } from '@sker/sdk'
import { root } from '@sker/core'
import { Subject, takeUntil, finalize } from 'rxjs'
import { getExposedInputs, getExposedOutputs } from '../../utils/workflow-ports'

/**
 * 工作流操作 Hook
 *
 * 优雅设计：
 * - 集中管理工作流的执行、保存等核心操作
 * - 提供清晰的业务接口
 * - 错误处理和状态管理分离
 */
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

      // executeAst 返回 Observable，利用流式特性实时更新状态
      // finalize 确保无论如何结束都会重置状态
      const subscription = executeAstWithWorkflowGraph(targetNode.id, workflow.workflowAst)
        .pipe(
          finalize(() => {
            // 确保在所有情况下都重置运行状态
            onSetRunning?.(false)
          })
        )
        .subscribe({
          next: (updatedWorkflow) => {
            // 每次 next 事件实时更新工作流状态
            Object.assign(workflow.workflowAst!, updatedWorkflow)
            workflow.syncFromAst()
          },
          error: async (error) => {
            const errorInfo = extractErrorInfo(error)
            console.error(`工作流执行异常`)
            onShowToast?.('error', '工作流执行异常', errorInfo.message)

            // 执行失败后保存状态
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

            // 执行完成后保存状态
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

      // 返回取消订阅函数，便于外部管理
      return () => subscription.unsubscribe()
    },
    [workflow, onShowToast, onSetRunning, getViewport]
  )

  /**
   * 运行单个节点（不影响下游）
   *
   * 优雅设计：
   * - 调用 executeNodeIsolated，只执行选中的节点
   * - 使用上游节点的历史输出作为输入
   * - 不触发下游节点重新执行
   * - 执行前后自动保存状态，确保数据持久化
   * - 适合测试和调试场景
   */
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

      // executeNodeIsolated 返回 Observable，只执行单个节点
      // finalize 确保无论如何结束都会重置状态
      const subscription = executeNodeIsolated(targetNode.id, workflow.workflowAst)
        .pipe(
          finalize(() => {
            // 确保在所有情况下都重置运行状态
            onSetRunning?.(false)
          })
        )
        .subscribe({
          next: (updatedWorkflow) => {
            // 每次 next 事件实时更新工作流状态
            Object.assign(workflow.workflowAst!, updatedWorkflow)
            workflow.syncFromAst()
          },
          error: async (error) => {
            const errorInfo = extractErrorInfo(error)
            console.error(`节点执行异常`)
            onShowToast?.('error', '节点执行异常', errorInfo.message)

            // 执行失败后保存状态
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
            // 只统计目标节点的执行结果
            const nodeState = getNodeById(workflow.workflowAst!.nodes, nodeId)?.state

            if (nodeState === 'success') {
              onShowToast?.('success', '节点执行成功', '该节点已完成执行')
            } else if (nodeState === 'fail') {
              onShowToast?.('error', '节点执行失败', '请检查节点配置和输入数据')
            }

            // 执行完成后保存状态
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

      // 返回取消订阅函数，便于外部管理
      return () => subscription.unsubscribe()
    },
    [workflow, onShowToast, onSetRunning, getViewport]
  )

  /**
   * 提取错误信息的辅助函数
   */
  function extractErrorInfo(error: unknown): { message: string; type?: string } {
    if (!error) return { message: '未知错误' }

    if (typeof error === 'object' && 'message' in error) {
      const err = error as any
      const deepError = err.cause ? extractDeepestError(err.cause) : err
      const rawMessage = deepError?.message || err.message || '执行失败'

      // 确保 message 始终是字符串
      let message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage)

      // Special handling for login expired errors
      if (message.includes('登录') || message.includes('LOGIN')) {
        return { message: '登录态已过期，需要更换账号', type: 'LOGIN_EXPIRED' }
      }

      return { message, type: err.type }
    }

    if (typeof error === 'string') {
      return { message: error }
    }

    return { message: String(error) }
  }

  function extractDeepestError(error: any): any {
    if (!error) return null
    if (error.cause) {
      return extractDeepestError(error.cause)
    }
    return error
  }

  /**
   * 运行整个工作流
   *
   * 优雅设计：
   * - 利用 Observable + takeUntil 实现优雅的取消机制
   * - 通过 Subject emit 值来触发取消，符合响应式编程范式
   * - 执行前后自动保存状态，确保数据持久化
   * - 自动统计执行结果，提供清晰反馈
   * - 支持运行前配置输入参数，应用到对应节点
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

      // 如果有正在运行的工作流，先取消
      if (abortControllerRef.current) {
        cancelSubject$.current.next()

        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        onShowToast?.('info', '已取消上一次运行', '开始新的工作流执行')

        // 重置正在运行的节点状态
        workflow.workflowAst.nodes.forEach(node => {
          if (node.state === 'running') {
            node.state = 'pending'
            node.error = undefined
          }
        })
        workflow.syncFromAst()
      }

      // 应用输入参数到对应节点
      if (inputs && Object.keys(inputs).length > 0) {
        console.log('🎯 [runWorkflow] 开始应用输入参数，inputs 对象:', inputs)
        console.log('🎯 [runWorkflow] inputs entries:', Object.entries(inputs))

        Object.entries(inputs).forEach(([key, value]) => {
          // 跳过 undefined 值（保留节点默认值）
          if (value === undefined) {
            console.log(`⚠️ [runWorkflow] 跳过 undefined 值: ${key}`)
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

          const targetNode = getNodeById(workflow.workflowAst!.nodes, nodeId)
          if (targetNode) {
            console.log(`🎯 [runWorkflow] 找到目标节点 ${nodeId}`)
            console.log(`🎯 [runWorkflow] 赋值前 ${propertyKey} =`, (targetNode as any)[propertyKey])
            console.log(`✅ 设置节点 ${nodeId}.${propertyKey} =`, value);
            // 直接赋值，不检查属性是否存在（支持动态属性）
            (targetNode as any)[propertyKey] = value
            console.log(`🎯 [runWorkflow] 赋值后 ${propertyKey} =`, (targetNode as any)[propertyKey])
          } else {
            console.warn(`⚠️ 未找到节点: ${nodeId}`)
          }
        })
        workflow.syncFromAst()
        console.log('✅ 输入参数应用完成');
        console.log('🎯 [runWorkflow] 应用参数后的工作流 AST:', workflow.workflowAst)
      } else {
        console.log('⚠️ [runWorkflow] inputs 为空或没有值')
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

      // 创建新的取消 Subject（重置上一次的）
      cancelSubject$.current = new Subject<void>()

      // 创建新的 AbortController
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // 将 abortSignal 附加到工作流上下文
      workflow.workflowAst.abortSignal = abortController.signal

      onSetRunning?.(true)

      // executeAst 返回 Observable，使用 takeUntil 监听取消信号
      // finalize 确保无论如何结束（完成、错误、取消）都会重置状态
      const subscription = executeAst(workflow.workflowAst, workflow.workflowAst)
        .pipe(
          takeUntil(cancelSubject$.current),
          finalize(() => {
            // 确保在所有情况下都重置运行状态和控制器引用
            abortControllerRef.current = null
            onSetRunning?.(false)
          })
        )
        .subscribe({
          next: (updatedWorkflow) => {
            // 每次 next 事件实时更新工作流状态
            Object.assign(workflow.workflowAst!, updatedWorkflow)
            workflow.syncFromAst()
          },
          error: async (error) => {
            const errorInfo = extractErrorInfo(error)

            // 检查是否是取消导致的错误
            if (error?.name === 'AbortError' || errorInfo.message.includes('取消')) {
              onShowToast?.('info', '工作流已取消', '用户主动取消执行')
            } else {
              console.error('工作流执行异常:', error)
              onShowToast?.('error', '工作流执行异常', errorInfo.message)
            }

            // 执行失败后保存状态
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

            // 执行完成后保存状态
            try {
              if (getViewport) {
                workflow.workflowAst!.viewport = getViewport()
              }
              const controller = root.get<WorkflowController>(WorkflowController)
              await controller.saveWorkflow(workflow.workflowAst!)
            } catch (error: any) {
              console.error('执行完成后保存工作流失败:', error)
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

    // 重置正在运行的节点状态
    if (workflow.workflowAst) {
      workflow.workflowAst.nodes.forEach(node => {
        if (node.state === 'running') {
          node.state = 'pending'
          node.error = undefined
        }
      })
      workflow.syncFromAst()
    }

    onSetRunning?.(false)
    onShowToast?.('info', '工作流已取消', '已停止执行')
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

  return {
    runNode,
    runNodeIsolated,
    runWorkflow,
    cancelWorkflow,
    saveWorkflow,
    saveSubWorkflow,
  }
}
