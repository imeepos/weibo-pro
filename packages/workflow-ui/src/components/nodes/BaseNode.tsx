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
      isConnectable={true}
      className={cn(
        '!w-3 !h-3 !border-2 rounded-full transition-all duration-150',
        'hover:!w-4 hover:!h-4 hover:shadow-lg',
        '!z-50 !cursor-crosshair',
        isTarget
          ? '!bg-blue-500 !border-blue-300 hover:!bg-blue-400'
          : '!bg-green-500 !border-green-300 hover:!bg-green-400'
      )}
    />
  );
};

const PortRow = ({
  input,
  output,
}: {
  input?: { property: string; label?: string; isMulti?: boolean };
  output?: { property: string; label?: string; isMulti?: boolean };
}) => (
  <div className="relative flex items-center justify-between h-6 px-2">
    {/* 输入端口：Handle 在左边缘，文字紧随其后 */}
    <div className="flex items-center gap-1 relative">
      {input && (
        <>
          <HandleWrapper port={input} type="target" />
          <div className="absolute flex right-4">
            <span className="text-xs text-slate-200 truncate ml-1">
              {input.label || input.property}
            </span>
            {input.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
          </div>
        </>
      )}
    </div>
    {/* 输出端口：文字在左，Handle 在右边缘 */}
    <div className="flex items-center gap-1 relative">
      {output && (
        <>
          <div className="absolute left-4">
            {output.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
            <span className="text-xs text-slate-200 truncate mr-1">
              {output.label || output.property}
            </span>
          </div>
          <HandleWrapper port={output} type="source" />
        </>
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
        'flex flex-col rounded-2xl border-[2px] relative',
        'group pb-1 shadow-xs rounded-[15px] w-[240px] bg-workflow-block-bg hover:shadow-lg',
        'cursor-move select-none'
      )}
      style={{
        borderColor: getBorderColor(),
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
      }}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-center rounded-t-2xl px-3 py-4 border-b">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500 mr-2 shrink-0">
          <div className="w-3 h-3 bg-white rounded-sm"></div>
        </div>
        <div className="text-sm font-medium text-white truncate">
          {metadata.title || data.type}
        </div>
      </div>
      {/* 渲染输入输出端口 - 配对显示 */}
      <div className="flex flex-col gap-1 mt-2 relative">
        {Array.from({ length: Math.max(metadata.inputs.length, metadata.outputs.length) }).map((_, index) => (
          <PortRow
            key={`port-${index}`}
            input={metadata.inputs[index]}
            output={metadata.outputs[index]}
          />
        ))}
        {CustomRender}
      </div>
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
