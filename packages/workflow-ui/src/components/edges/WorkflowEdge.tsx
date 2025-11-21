import React, { memo, useMemo, useState, useEffect, useRef } from 'react'
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { WorkflowEdge as IWorkflowEdge } from '../../types'
import { EDGE_TYPE_STYLES, EDGE_MODE_STYLES } from '../../types/edge.types'
import { EdgeMode } from '@sker/workflow'

/**
 * 统一的工作流边组件
 *
 * 优雅设计：
 * - 单一职责：一个组件处理所有边的渲染
 * - 视觉即文档：通过 mode 决定样式，回退到 edgeType
 * - 动态标签：选中时显示模式标识
 * - 事件驱动动画：监听 node-emitting 事件触发数据流动画
 */
export const WorkflowEdge = memo((props: EdgeProps<IWorkflowEdge>) => {
  const { id, source, sourceX, sourceY, targetX, targetY, data, selected } = props
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  const svgGroupRef = useRef<SVGGElement>(null)
  /**
   * 优雅设计：视觉即文档
   *
   * 优先级：
   * 1. mode（merge/zip/combineLatest/withLatestFrom）
   * 2. styleType（data/control/conditional/error/success）
   * 3. edgeType（data/control）- 最终回退
   */
  const edgeStyle = useMemo(() => {
    const mode = data?.edge?.mode as EdgeMode | undefined
    if (mode && mode in EDGE_MODE_STYLES) {
      return EDGE_MODE_STYLES[mode]
    }
    const styleType = data?.styleType || data?.edgeType || 'data'
    return EDGE_TYPE_STYLES[styleType]
  }, [data?.edge?.mode, data?.styleType, data?.edgeType])
  /**
   * 监听源节点的 emitting 事件
   *
   * 直接 DOM 操作方案:
   * - 绕过 React 状态管理
   * - 避免重新渲染导致的状态重置
   * - 使用原生 SVG 动画
   */
  useEffect(() => {
    console.log('🔧 useEffect 设置事件监听器', {
      source,
      id,
      svgGroupRefExists: !!svgGroupRef.current,
      edgeStyleStroke: edgeStyle.stroke,
    })

    const handleNodeEmitting = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId } = customEvent.detail

      console.log('📥 收到 node-emitting 事件', { nodeId, source, match: nodeId === source })

      if (nodeId === source) {
        console.log('🎯 直接DOM操作启动动画:', {
          nodeId,
          source,
          edgeId: id,
          svgGroupRefCurrent: svgGroupRef.current,
          edgePath: edgePath.substring(0, 100),
          edgeStyleStroke: edgeStyle.stroke,
        })

        if (!svgGroupRef.current) {
          console.error('❌ svgGroupRef.current 为 null')
          return
        }

        // 先添加一个测试圆圈,确保 DOM 操作可行
        const testCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        testCircle.setAttribute('cx', '0')
        testCircle.setAttribute('cy', '0')
        testCircle.setAttribute('r', '20')
        testCircle.setAttribute('fill', 'red')
        svgGroupRef.current.appendChild(testCircle)
        console.log('🔴 添加了测试红色圆圈 (固定位置)')

        // 清除旧动画
        setTimeout(() => {
          svgGroupRef.current!.innerHTML = ''
          console.log('🧹 清除测试圆圈')

          // 创建5个弹珠
          for (let i = 0; i < 5; i++) {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

            // 光晕
            const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            halo.setAttribute('r', '8')
            halo.setAttribute('fill', edgeStyle.stroke)
            halo.setAttribute('opacity', '0.3')

            const haloAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion')
            haloAnim.setAttribute('dur', '2s')
            haloAnim.setAttribute('begin', `${i * 0.4}s`)
            haloAnim.setAttribute('repeatCount', 'indefinite')
            haloAnim.setAttribute('path', edgePath)
            halo.appendChild(haloAnim)

            // 实心圆
            const marble = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            marble.setAttribute('r', '5')
            marble.setAttribute('fill', edgeStyle.stroke)

            const marbleAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion')
            marbleAnim.setAttribute('dur', '2s')
            marbleAnim.setAttribute('begin', `${i * 0.4}s`)
            marbleAnim.setAttribute('repeatCount', 'indefinite')
            marbleAnim.setAttribute('path', edgePath)
            marble.appendChild(marbleAnim)

            // 高光
            const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            highlight.setAttribute('r', '2')
            highlight.setAttribute('fill', '#ffffff')
            highlight.setAttribute('opacity', '0.9')

            const highlightAnim = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'animateMotion'
            )
            highlightAnim.setAttribute('dur', '2s')
            highlightAnim.setAttribute('begin', `${i * 0.4}s`)
            highlightAnim.setAttribute('repeatCount', 'indefinite')
            highlightAnim.setAttribute('path', edgePath)
            highlight.appendChild(highlightAnim)

            g.appendChild(halo)
            g.appendChild(marble)
            g.appendChild(highlight)
            svgGroupRef.current!.appendChild(g)
          }

          console.log('✅ 动画元素已添加到 DOM', {
            childCount: svgGroupRef.current!.children.length,
          })
        }, 1000)

        // 5秒后清除
        setTimeout(() => {
          console.log('⏹️ 清除动画元素')
          if (svgGroupRef.current) {
            svgGroupRef.current.innerHTML = ''
          }
        }, 5000)
      }
    }

    window.addEventListener('node-emitting', handleNodeEmitting)
    return () => {
      console.log('🧹 清理事件监听器', { source, id })
      window.removeEventListener('node-emitting', handleNodeEmitting)
    }
  }, [source, id, edgePath, edgeStyle.stroke])

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    const customEvent = new CustomEvent('edge-delete', {
      detail: { edgeId: id },
    })
    window.dispatchEvent(customEvent)
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const customEvent = new CustomEvent('edge-context-menu', {
      detail: { edgeId: id, event },
    })
    window.dispatchEvent(customEvent)
  }



  const showLabel = selected && data?.edge?.mode
  const modeConfig = data?.edge?.mode ? EDGE_MODE_STYLES[data.edge.mode as EdgeMode] : null

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: edgeStyle.stroke,
          strokeWidth: edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.strokeDasharray,
          zIndex: 9
        }}
        id={id}
        interactionWidth={20}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={6}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ cursor: 'pointer' }}
      />

      {/* RxJS 弹珠图风格数据流动画容器 */}
      <g ref={svgGroupRef} className="marble-animation-container" />

      {showLabel && modeConfig && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="rounded-md bg-[#111318] border border-[#282e39] px-2 py-1 text-xs text-white shadow-lg flex items-center gap-1.5">
              <span>{modeConfig.icon}</span>
              <span>{modeConfig.label}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

WorkflowEdge.displayName = 'WorkflowEdge'
