import React, { memo } from 'react'
import { EdgeLabelRenderer } from '@xyflow/react'

/**
 * 边数据流动画组件
 *
 * 优雅设计:
 * - 纯粹的职责: 渲染沿路径移动的圆点
 * - CSS 驱动: 使用 CSS animation 沿路径移动
 * - 自然流畅: cubic-bezier 缓动函数
 * - 视觉反馈: 光晕效果增强运动感
 */
export interface EdgeDataFlowProps {
  /** 边的起点 X */
  sourceX: number
  /** 边的起点 Y */
  sourceY: number
  /** 边的终点 X */
  targetX: number
  /** 边的终点 Y */
  targetY: number
  /** 圆点颜色 (继承边的颜色) */
  color: string
  /** 动画持续时间 (ms) */
  duration?: number
  /** 唯一标识 (用于支持多个圆点同时传输) */
  id?: string
}

export const EdgeDataFlow = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  color,
  duration = 800,
  id
}: EdgeDataFlowProps) => {
  // 计算贝塞尔曲线控制点
  const offsetX = Math.abs(targetX - sourceX) / 2
  const controlPointX1 = sourceX + offsetX
  const controlPointX2 = targetX - offsetX

  return (
    <EdgeLabelRenderer>
      <div
        key={id}
        className="edge-data-flow-dot"
        style={{
          position: 'absolute',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}, 0 0 6px ${color}`,
          pointerEvents: 'none',
          zIndex: 1000,
          left: `${sourceX}px`,
          top: `${sourceY}px`,
          animation: `edgeDataFlowMove ${duration}ms cubic-bezier(0.4, 0.0, 0.2, 1) forwards`,
          '--start-x': `${sourceX}px`,
          '--start-y': `${sourceY}px`,
          '--control-x1': `${controlPointX1}px`,
          '--control-y1': `${sourceY}px`,
          '--control-x2': `${controlPointX2}px`,
          '--control-y2': `${targetY}px`,
          '--end-x': `${targetX}px`,
          '--end-y': `${targetY}px`,
        } as React.CSSProperties}
      >
        {/* 内核圆点 */}
        <div
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* CSS Keyframes 注入 */}
      <style>{`
        @keyframes edgeDataFlowMove {
          0% {
            left: var(--start-x);
            top: var(--start-y);
            opacity: 0;
            transform: scale(0.5);
          }
          5% {
            opacity: 1;
            transform: scale(1);
          }
          95% {
            opacity: 1;
          }
          100% {
            left: var(--end-x);
            top: var(--end-y);
            opacity: 0;
            transform: scale(0.5);
          }
        }
      `}</style>
    </EdgeLabelRenderer>
  )
})

EdgeDataFlow.displayName = 'EdgeDataFlow'
