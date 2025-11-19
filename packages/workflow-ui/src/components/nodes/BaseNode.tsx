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
  <div className="relative flex items-center gap-2 h-6" style={{ top: offsetTop }}>
    {input && (
      <div className="flex items-center flex-1 pl-2">
        <HandleWrapper port={input} type="target" />
        <div className="flex items-center gap-1 text-xs text-slate-200">
          <span className="truncate">{input.label || input.property}</span>
          {input.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
        </div>
      </div>
    )}
    {output &&
      <div className="flex items-center gap-2 flex-1 justify-end pr-2">
        <HandleWrapper port={output} type="source" />
        <div className="flex items-center gap-1 text-xs text-slate-200">
          <span className="truncate">{output.label || output.property}</span>
          {output.isMulti && <span className="text-[10px] text-slate-400 font-mono">[]</span>}
        </div>
      </div>
    }
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
        'flex flex-col rounded-2xl border-[2px]',
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
      <div className="flex items-center rounded-t-2xl px-3 py-4 border-b">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500 mr-2 shrink-0">
          <div className="w-3 h-3 bg-white rounded-sm"></div>
        </div>
        <div className="text-sm font-medium text-white truncate">
          {metadata.title || data.type}
        </div>
      </div>
      {CustomRender}
      {/* 渲染输入输出端口 */}
      <div className="flex flex-col gap-1 mt-2">
        {/* 左侧部分 显示输入端口 */}
        {metadata.inputs.map((input, index) => (
          <PortRow
            key={`input-${input.property}`}
            input={input}
            offsetTop={0}
          />
        ))}
        {/* 右侧部分显示输出端口 */}
        {metadata.outputs.map((output, index) => (
          <PortRow
            key={`output-${output.property}`}
            output={output}
            offsetTop={0}
          />
        ))}
      </div>
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
