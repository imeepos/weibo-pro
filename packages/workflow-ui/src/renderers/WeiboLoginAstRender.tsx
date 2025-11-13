import React, { memo, useCallback, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { WorkflowNodeProps } from '../types'
import { getNodeMetadata } from '../adapters'
import { cn } from '../utils/cn'
import { WeiboLoginAst } from '@sker/workflow-ast'
import { InlineExecutor, WeiboLoginExecutor } from '../components/execution/InlineExecutor'

// 简单的状态指示器
const NodeStatus = ({ state, error }: { state?: string; error?: unknown }) => {
  const statusConfig = {
    pending: { color: 'bg-gray-500', label: '待执行' },
    running: { color: 'bg-blue-500 animate-pulse', label: '执行中' },
    success: { color: 'bg-green-500', label: '成功' },
    fail: { color: 'bg-red-500', label: '失败' },
  };

  const config = statusConfig[state as keyof typeof statusConfig] || statusConfig.pending;

  const errorMessage = error ? (typeof error === 'string' ? error : JSON.stringify(error)) : undefined;

  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-xs text-gray-300">{config.label}</span>
      {errorMessage && <span className="text-xs text-red-400" title={errorMessage}>⚠</span>}
    </div>
  );
};

// 端口包装器
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
    <div
      className={cn(
        'w-3 h-3 border-2 rounded-full',
        isTarget ? 'bg-blue-500 border-blue-300' : 'bg-green-500 border-green-300'
      )}
    />
  );
};

// 端口行
const PortRow = ({
  input,
  output,
}: {
  input?: { property: string; label?: string; isMulti?: boolean };
  output?: { property: string; label?: string; isMulti?: boolean };
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

// 微博登录预览组件
const WeiboLoginPreview = ({ ast }: { ast: WeiboLoginAst }) => {
  return (
    <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50 rounded border border-slate-600 p-2">
      <div className="text-lg">🔐</div>
      <div className="text-xs text-slate-300 mt-1">
        {ast.userId ? `用户: ${ast.userId}` : '未配置'}
      </div>
      {ast.sessionId && (
        <div className="text-[10px] text-slate-400 mt-1">
          会话: {ast.sessionId.substring(0, 8)}...
        </div>
      )}
    </div>
  );
};

// 设置表单组件
const WeiboLoginSetting = ({ ast, onUpdate }: { ast: WeiboLoginAst; onUpdate: (ast: WeiboLoginAst) => void }) => {
  const [userId, setUserId] = useState(ast.userId || '')
  const [sessionId, setSessionId] = useState(ast.sessionId || '')

  const handleSave = () => {
    ast.userId = userId
    ast.sessionId = sessionId || undefined
    onUpdate(ast)
  }

  return (
    <div className="p-4 bg-slate-800 border border-slate-600 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-4">微博登录配置</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            用户ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入微博用户ID"
          />
          <p className="mt-1 text-xs text-slate-400">
            微博用户的唯一标识符
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            会话ID (可选)
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入会话ID"
          />
          <p className="mt-1 text-xs text-slate-400">
            已有会话ID，留空则创建新会话
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            保存配置
          </button>
          <button
            onClick={() => {
              setUserId('')
              setSessionId('')
            }}
            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            重置
          </button>
        </div>
      </div>

      {/* 执行器区域 */}
      <div className="mt-6 pt-4 border-t border-slate-600">
        <h4 className="text-md font-medium text-white mb-3">节点执行</h4>
        <InlineExecutor
          ast={ast}
          executorName="微博登录"
          onComplete={(result) => {
            console.log('微博登录执行完成:', result)
          }}
          onError={(error) => {
            console.error('微博登录执行失败:', error)
          }}
        />
      </div>
    </div>
  );
};

// 主渲染组件
export const WeiboLoginAstRender = memo(({ id, data, selected }: WorkflowNodeProps) => {
  const metadata = getNodeMetadata(data.nodeClass);
  const maxPorts = Math.max(metadata.inputs.length, metadata.outputs.length);
  const { getNodes, setNodes } = useReactFlow();

  // 获取当前节点的 WeiboLoginAst 实例
  const weiboLoginAst = data.ast as WeiboLoginAst;

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // 触发打开设置面板事件
    const customEvent = new CustomEvent('open-setting-panel', {
      detail: {
        nodeId: id,
        nodeData: data,
        position: { x: event.clientX, y: event.clientY }
      },
    });
    window.dispatchEvent(customEvent);
  }, [id, data]);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // 触发自定义事件，让 WorkflowCanvas 处理
    const customEvent = new CustomEvent('node-context-menu', {
      detail: { nodeId: id, event, nodeData: data },
    });
    window.dispatchEvent(customEvent);
  };

  const handleAstUpdate = (updatedAst: WeiboLoginAst) => {
    // 更新节点数据
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ast: updatedAst } }
          : node
      )
    );
  };

  return (
    <div
      className={cn(
        'px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg cursor-pointer',
        'hover:bg-slate-700 hover:border-slate-500',
        selected && 'bg-blue-900 border-blue-500',
        'select-none'
      )}
      style={{
        minWidth: '200px'
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* 节点标题 */}
      <div className="mb-2 pb-1.5 border-b border-slate-600 flex items-center justify-between">
        <div className="text-sm font-medium text-white">
          {data.label}
        </div>
        <NodeStatus state={data.state} error={data.error} />
      </div>

      {/* 微博登录预览 */}
      <div className="mb-2">
        <WeiboLoginPreview ast={weiboLoginAst} />
      </div>

      {/* 提示文字 */}
      <div className="text-xs text-slate-400 text-center mb-2">
        双击配置登录信息
      </div>

      {/* 端口区域 */}
      {maxPorts > 0 && (
        <div className="space-y-0">
          {Array.from({ length: maxPorts }).map((_, index) => (
            <PortRow
              key={
                metadata.inputs[index]?.property ??
                metadata.outputs[index]?.property ??
                `port-${index}`
              }
              input={metadata.inputs[index]}
              output={metadata.outputs[index]}
            />
          ))}
        </div>
      )}
    </div>
  );
});

WeiboLoginAstRender.displayName = 'WeiboLoginAstRender';

// 设置方法装饰器
export function setting() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // 注册设置方法
    const originalMethod = descriptor.value;
    descriptor.value = function (ast: WeiboLoginAst, onUpdate: (ast: WeiboLoginAst) => void) {
      return originalMethod.call(this, ast, onUpdate);
    };
    return descriptor;
  };
}

// 预览方法装饰器
export function preview() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // 注册预览方法
    const originalMethod = descriptor.value;
    descriptor.value = function (ast: WeiboLoginAst) {
      return originalMethod.call(this, ast);
    };
    return descriptor;
  };
}

// 渲染方法装饰器
export function render() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // 注册渲染方法
    const originalMethod = descriptor.value;
    descriptor.value = function (props: WorkflowNodeProps) {
      return originalMethod.call(this, props);
    };
    return descriptor;
  };
}