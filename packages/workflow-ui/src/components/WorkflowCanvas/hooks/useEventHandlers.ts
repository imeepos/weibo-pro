import { useEffect } from 'react'

export interface EventHandlers {
  onEdgeDelete?: (edgeId: string) => void
  onOpenSubWorkflow?: (nodeId: string, workflowAst: any) => void
  onOpenSettingPanel?: (nodeId: string, nodeData: any) => void
  onOpenEdgeConfig?: (edgeId: string) => void
  onNodeDoubleClick?: (nodeId: string) => void
  onNodeSelected?: (nodeId: string) => void
}

/**
 * 事件管理专家
 *
 * 优雅设计：
 * - 统一管理所有自定义事件监听器
 * - 避免在组件中散落多个 useEffect
 * - 提供清晰的事件处理接口
 */
export const useEventHandlers = (handlers: EventHandlers, deps: React.DependencyList = []) => {
  const {
    onEdgeDelete,
    onOpenSubWorkflow,
    onOpenSettingPanel,
    onOpenEdgeConfig,
    onNodeDoubleClick,
    onNodeSelected
  } = handlers

  /**
   * 监听边双击删除事件
   *
   * 优雅设计：
   * - 边组件通过自定义事件触发删除
   * - 在这里统一处理，同步到 AST 和 UI
   * - 确保数据一致性
   */
  useEffect(() => {
    if (!onEdgeDelete) return

    const handleEdgeDelete = (e: Event) => {
      const customEvent = e as CustomEvent
      const { edgeId } = customEvent.detail

      console.log('监听到 edge-delete 事件:', edgeId)
      onEdgeDelete(edgeId)
    }

    window.addEventListener('edge-delete', handleEdgeDelete)
    return () => window.removeEventListener('edge-delete', handleEdgeDelete)
  }, [onEdgeDelete, ...deps])

  /**
   * 监听打开子工作流事件
   *
   * 优雅设计：
   * - WorkflowGraphAstRender 组件通过自定义事件触发
   * - 在这里统一处理子工作流弹框的打开
   * - 确保父子工作流状态的一致性
   */
  useEffect(() => {
    if (!onOpenSubWorkflow) return

    const handleOpenSubWorkflow = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId, workflowAst } = customEvent.detail

      console.log('监听到 open-sub-workflow 事件:', { nodeId })
      onOpenSubWorkflow(nodeId, workflowAst)
    }

    window.addEventListener('open-sub-workflow', handleOpenSubWorkflow)
    return () => window.removeEventListener('open-sub-workflow', handleOpenSubWorkflow)
  }, [onOpenSubWorkflow, ...deps])

  /**
   * 监听打开设置面板事件
   *
   * 优雅设计：
   * - 节点渲染器通过自定义事件触发
   * - 在这里统一处理设置面板的打开
   * - 支持双击节点展开配置表单
   */
  useEffect(() => {
    if (!onOpenSettingPanel) return

    const handleOpenSettingPanel = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId, nodeData } = customEvent.detail

      console.log('监听到 open-setting-panel 事件:', { nodeId })
      onOpenSettingPanel(nodeId, nodeData)
    }

    window.addEventListener('open-setting-panel', handleOpenSettingPanel)
    return () => window.removeEventListener('open-setting-panel', handleOpenSettingPanel)
  }, [onOpenSettingPanel, ...deps])

  /**
   * 监听打开边配置对话框事件
   *
   * 优雅设计：
   * - 右键菜单通过自定义事件触发
   * - 在这里统一处理边配置对话框的打开
   */
  useEffect(() => {
    if (!onOpenEdgeConfig) return

    const handleOpenEdgeConfig = (e: Event) => {
      const customEvent = e as CustomEvent
      const { edgeId } = customEvent.detail

      console.log('监听到 open-edge-config 事件:', { edgeId })
      onOpenEdgeConfig(edgeId)
    }

    window.addEventListener('open-edge-config', handleOpenEdgeConfig)
    return () => window.removeEventListener('open-edge-config', handleOpenEdgeConfig)
  }, [onOpenEdgeConfig, ...deps])

  /**
   * 监听节点双点击查看节点事件
   */
  useEffect(() => {
    if (!onNodeDoubleClick) return

    const handleDoubleClick = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId } = customEvent.detail
      onNodeDoubleClick(nodeId)
    }

    window.addEventListener('node-double-click', handleDoubleClick)
    return () => window.removeEventListener('node-double-click', handleDoubleClick)
  }, [onNodeDoubleClick, ...deps])

  /**
   * 监听节点选择变化事件
   *
   * 单击节点时选中（高亮），但不自动打开抽屉
   */
  useEffect(() => {
    if (!onNodeSelected) return

    const handleNodeClick = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId } = customEvent.detail
      console.log('节点被选中:', nodeId)
      onNodeSelected(nodeId)
    }

    window.addEventListener('node-selected', handleNodeClick)
    return () => window.removeEventListener('node-selected', handleNodeClick)
  }, [onNodeSelected, ...deps])
}