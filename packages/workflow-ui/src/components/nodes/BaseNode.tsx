import React, { memo, useEffect } from 'react'
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { WorkflowNode } from '../../types'
import { findNodeType, getNodeMetadata } from '../../adapters'
import { cn } from '../../utils/cn'
import { useRender } from './hook'
import { fromJson } from '@sker/workflow'
import { NODE_STATE_COLORS } from '../../types/node.types'


const HandleWrapper = ({
  port,
  type,
}: {
  port?: { property: string; label?: string; isMulti?: boolean };
  type: 'source' | 'target';
}) => {
  if (!port) {
    return null;
  }

  const isTarget = type === 'target';

  return (
    <Handle
      type={type}
      id={port.property}
      position={isTarget ? Position.Left : Position.Right}
      className={cn(
        '!w-3 !h-3 !border-2 rounded-full',
        isTarget ? '!bg-blue-500 !border-blue-300' : '!bg-green-500 !border-green-300'
      )}
    />
  );
};

const PortRow = ({
  input,
  output,
  offsetTop,
}: {
  input?: { property: string; label?: string; isMulti?: boolean };
  output?: { property: string; label?: string; isMulti?: boolean };
  offsetTop?: number;
}) => (
  <div className="relative flex items-center gap-2 h-6">
    <HandleWrapper port={input} type="target" />
    <HandleWrapper port={output} type="source" />
    <div className="flex items-center flex-1 pl-2">
      {input && (
        <div className="flex items-center gap-1 text-xs text-slate-200">
          <span className="truncate">{input.label || input.property}</span>
          {input.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
        </div>
      )}
    </div>

    <div className="flex items-center gap-2 flex-1 justify-end pr-2">
      {output && (
        <div className="flex items-center gap-1 text-xs text-slate-200">
          <span className="truncate">{output.label || output.property}</span>
          {output.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
        </div>
      )}
    </div>
  </div>
);

export const BaseNode = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const nodeClass = findNodeType(data.type)!;
  const metadata = getNodeMetadata(nodeClass);
  const updateNodeInternals = useUpdateNodeInternals();
  const CustomRender = useRender(fromJson(data));
  // 通知 React Flow 更新节点内部状态（Handle 位置）
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, metadata.inputs.length, metadata.outputs.length, updateNodeInternals]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    // 触发自定义事件，让 WorkflowCanvas 处理
    const customEvent = new CustomEvent('node-context-menu', {
      detail: { nodeId: id, event, nodeData: data },
    })
    window.dispatchEvent(customEvent)
  }

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    // 触发自定义事件，打开左侧抽屉
    const customEvent = new CustomEvent('node-double-click', {
      detail: { nodeId: id, nodeData: data },
    })
    window.dispatchEvent(customEvent)
  }

  // 根据节点状态获取边框颜色
  const getBorderColor = () => {
    if (selected) return '#818cf6'; // workflow-primary
    if (data.state) return NODE_STATE_COLORS[data.state as keyof typeof NODE_STATE_COLORS] || NODE_STATE_COLORS.pending;
    return 'transparent';
  };

  return (
    <div
      className={cn(
        'flex rounded-2xl border-[2px]',
        'group relative pb-1 shadow-xs rounded-[15px] w-[240px] bg-workflow-block-bg hover:shadow-lg',
        'cursor-move select-none'
      )}
      style={{
        borderColor: getBorderColor(),
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {/* 输入端口 */}
      {metadata.inputs.map((input, index) => (
        <Handle
          key={`input-${input.property}`}
          type="target"
          id={input.property}
          position={Position.Left}
          className={cn(
            '!h-4 !w-4 !rounded-none !border-none !bg-transparent !outline-none',
            'after:absolute after:left-1.5 after:top-1 after:h-2 after:w-0.5 after:bg-workflow-link-line-handle',
            'transition-all hover:scale-125 after:opacity-0 opacity-0',
            '!top-4 !-left-[9px] !translate-y-0'
          )}
          style={{ top: 32 + index * 24 }}
        />
      ))}

      {/* 输出端口 */}
      {metadata.outputs.map((output, index) => (
        <Handle
          key={`output-${output.property}`}
          type="source"
          id={output.property}
          position={Position.Right}
          className={cn(
            '!h-4 !w-4 !rounded-none !border-none !bg-transparent !outline-none',
            'after:absolute after:right-1.5 after:top-1 after:h-2 after:w-0.5 after:bg-workflow-link-line-handle',
            'transition-all hover:scale-125',
            '!top-4 !-right-[9px] !translate-y-0'
          )}
          style={{ top: 32 + index * 24 }}
        />
      ))}

      {/* 节点标题区域 */}
      <div className="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500 mr-2 shrink-0">
          <div className="w-3 h-3 bg-white rounded-sm"></div>
        </div>
        <div className="text-sm font-medium text-white truncate">
          {metadata.title || data.type}
        </div>
      </div>
      {CustomRender}
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
