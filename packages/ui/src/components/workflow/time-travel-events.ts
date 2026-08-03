'use client'

/**
 * 节点事件类型，工作流也是一个节点
 */
export type TimeTravelEvent<T = any> =
  | NodeRuningEvent
  | NodeEmitEvent<T>
  | NodeSuccessEvent
  | NodeFailEvent
  | NodeDeltaEvent
  | NodeProgressEvent;

// 节点运行
export interface NodeRuningEvent {
  type: 'node_runing';
  id: string;
}
// 节点发射
export interface NodeEmitEvent<T = any> {
  type: 'node_emit';
  id: string;
  data: Partial<T>;
}
// 节点成功
export interface NodeSuccessEvent<_T = any> {
  type: 'node_success';
  id: string;
}
// 节点失败
export interface NodeFailEvent {
  type: 'node_fail';
  id: string;
  error: string | undefined;
}
// 节点增量输出（流式）
export interface NodeDeltaEvent {
  type: 'node_delta';
  id: string;
  data: {
    delta: string;
    accumulated?: string;
    [key: string]: any;
  };
}
// 节点进度（工具调用、阶段性任务）
export interface NodeProgressEvent {
  type: 'node_progress';
  id: string;
  data: {
    round?: number;
    status?: 'executing' | 'completed';
    [key: string]: any;
  };
}

/**
 * 时间旅行调试器 Props
 */
export interface TimeTravelDebuggerProps {
  /** 事件列表 */
  events: TimeTravelEvent[]
  /** 当前事件索引 */
  currentIndex: number
  /** 总事件数 */
  totalEvents: number
  /** 当前事件 */
  currentEvent: TimeTravelEvent | null
  /** 是否正在回放 */
  isReplaying: boolean
  /** 回放速度 */
  replaySpeed: number

  // 控制回调
  /** 跳转到指定事件 */
  onJumpTo: (index: number) => void
  /** 后退一步 */
  onStepBackward: () => void
  /** 前进一步 */
  onStepForward: () => void
  /** 跳至起点 */
  onJumpToStart: () => void
  /** 跳至终点 */
  onJumpToEnd: () => void
  /** 自动回放 */
  onAutoReplay: () => void
  /** 暂停回放 */
  onPauseReplay: () => void
  /** 设置回放速度 */
  onSetReplaySpeed: (speed: number) => void
  /** 清空所有事件 */
  onClear: () => void
  /** 定位到节点 */
  onLocateNode?: (nodeId: string) => void

  /** 自定义样式 */
  className?: string
}
