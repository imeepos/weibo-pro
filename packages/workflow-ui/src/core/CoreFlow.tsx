import React, { useCallback, useEffect, useState } from "react";
import { ReactFlow, Node, Edge, OnNodesDelete, OnNodesChange, NodeMouseHandler } from '@xyflow/react'
import { fromJson, IEdge, INode, WorkflowGraphAst } from "@sker/workflow";
import { createNodeTypes } from "../components/nodes";
/**
 * 核心功能分类

  1. 数据管理

  nodes / edges              # 受控模式下的节点/边数据
  defaultNodes / defaultEdges # 非受控模式的初始数据
  onNodesChange / onEdgesChange # 数据变化回调
  onNodesDelete / onEdgesDelete # 删除事件

  2. 节点交互功能

  onNodeClick              # 点击节点
  onNodeDoubleClick        # 双击节点
  onNodeMouseEnter/Leave   # 鼠标进入/离开节点
  onNodeDragStart/Drag/DragStop # 拖拽节点
  onNodeContextMenu        # 右键菜单

  功能说明：
  - 节点可以被点击、拖拽、双击
  - 支持鼠标悬停事件
  - 可以响应右键菜单
  - 有完整的拖拽生命周期钩子

  3. 边的交互功能

  onEdgeClick              # 点击边
  onEdgeDoubleClick        # 双击边
  onEdgeMouseEnter/Leave   # 鼠标进入/离开边
  onReconnect              # 重新连接边（可拖拽改变连接点）
  onReconnectStart/End     # 开始/结束重连

  功能说明：
  - 边可以点击、双击
  - 支持鼠标悬停效果
  - 重连功能：可以拖拽边的起点或终点到新的节点

  4. 连接功能（核心）

  onConnect                # 连接两个节点（用户拖拽创建连接）
  onConnectStart/End       # 开始/结束连接
  connectionLineType       # 连接线类型（贝塞尔曲线、直线等）
  connectionMode           # 连接模式（严格/宽松）
  isValidConnection        # 验证连接是否合法

  功能说明：
  - 允许用户拖拽创建节点间的连接
  - 支持严格的源-目标连接或宽松的任意连接
  - 可以自定义验证规则
  - 提供多种连接线样式

  5. 视图控制和画布操作

  panOnDrag                # 拖拽平移画布
  zoomOnScroll             # 滚轮缩放
  zoomOnPinch              # 双指缩放
  zoomOnDoubleClick        # 双击缩放
  panOnScroll              # 滚轮平移
  minZoom / maxZoom        # 缩放范围限制
  fitView                  # 自动适应视图
  viewport / onViewportChange # 视口控制

  功能说明：
  - 支持多种方式平移和缩放画布
  - 可以限制缩放范围
  - 自动适应内容到视口

  6. 选择和框选功能

  selectionKeyCode         # 多选快捷键（Shift）
  multiSelectionKeyCode    # 多选键（Ctrl/Cmd）
  selectionOnDrag          # 拖拽创建选择框
  onSelectionChange        # 选择变化回调
  onSelectionDrag          # 拖拽选择区域

  功能说明：
  - 支持多选节点和边
  - 支持框选（拖拽创建选择框）
  - 可以批量拖拽选中的元素

  7. 键盘快捷键

  deleteKeyCode            # 删除键（Backspace/Delete）
  selectionKeyCode         # 选择键（Shift）
  panActivationKeyCode     # 平移键（Space）
  zoomActivationKeyCode    # 缩放键（Ctrl/Cmd）

  默认快捷键：
  - Delete/Backspace：删除选中项
  - Shift：框选模式
  - Space：平移
  - Ctrl/Cmd：多选/缩放

  8. 节点行为控制

  nodesDraggable           # 节点是否可拖拽
  nodesConnectable         # 是否可连接
  nodesFocusable           # 是否可聚焦
  selectNodesOnDrag        # 拖拽时是否选中节点
  autoPanOnNodeDrag        # 拖拽时自动平移画布

  9. 高级渲染功能

  nodeTypes                # 自定义节点类型
  edgeTypes                # 自定义边类型
  connectionLineComponent  # 自定义连接线组件
  onlyRenderVisibleElements # 仅渲染可见元素（性能优化）

  10. 样式和外观

  snapToGrid / snapGrid    # 对齐网格
  nodeOrigin               # 节点原点（中心点位置）
  colorMode                # 颜色模式（light/dark）

  核心可视化能力

  这个库能帮助你构建：

  1. 可交互流程图：节点拖拽、缩放、平移、连接
  2. 可视化编辑器：支持框选、多选、批量操作
  3. 自定义渲染：可以自定义节点和边的外观
  4. 数据流可视化：很适合展示工作流、数据管道、依赖关系
  5. 响应式设计：支持触摸手势、键盘快捷键

  在 Weibo-Pro 中的应用

  根据代码库结构，你们使用 React Flow 构建了工作流编辑器（Workflow UI），用于可视化编排微博数据采集和处理流程。

  例如：
  - 拖拽节点：从左侧工具栏拖拽到画布
  - 连接节点：连接微博API节点 → NLP分析节点 → 事件生成节点
  - 交互控制：缩放、平移、查看整个工作流
 */
export function toNode(node: INode) {
    return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node
    } as Node<INode>
}

export function toNodes(nodes: INode[]) {
    return nodes.map(toNode)
}

export function toEdge(edge: IEdge) {
    return {
        id: edge.id,
        type: edge.type,
        source: edge.from,
        target: edge.to,
        data: edge
    } as Edge<IEdge>
}

export function toEdges(edges: IEdge[]) {
    return edges.map(toEdge)
}

export const CoreFlow: React.FC<{ node: INode }> = ({ node }) => {
    const [ast, setAst] = useState<WorkflowGraphAst>(fromJson(node))
    useEffect(() => {
        const ast = fromJson<WorkflowGraphAst>(node)
        setAst(ast)
    }, [node])
    const onNodesDelete: OnNodesDelete<Node<INode>> = useCallback((nodes) => {
        console.log(`onNodesDelete`, { nodes })
    }, [ast])
    const onNodesChange: OnNodesChange<Node<INode>> = useCallback(nodes => {
        console.log(`onNodesChange`, { nodes })
    }, [ast])
    const onNodeClick: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeClick`, node)
    }, [ast])
    const onNodeDoubleClick: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeDoubleClick`, node)
    }, [ast])
    const onNodeContextMenu: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeContextMenu`, node)
    }, [ast])

    const onNodeMouseEnter: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeContextMenu`, node)
    }, [ast])
    const onNodeMouseLeave: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeContextMenu`, node)
    }, [ast])
    const onNodeMouseMove: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeContextMenu`, node)
    }, [ast])
    const onNodeDrag: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeContextMenu`, node)
    }, [ast])
    const onNodeDragStart: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeContextMenu`, node)
    }, [ast])
    const onNodeDragStop: NodeMouseHandler<Node<INode>> = useCallback(node => {
        console.log(`onNodeContextMenu`, node)
    }, [ast])
    return <ReactFlow
        nodes={toNodes(ast.nodes)}
        edges={toEdges(ast.edges)}
        nodeTypes={createNodeTypes()}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeMouseMove={onNodeMouseMove}
        onNodeDrag={onNodeDrag}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onNodesChange={onNodesChange}
    />
}
