/**
 * 社区演化时间线 —— 配置常量
 *
 * 仅包含事件类型/颜色的映射表与面板宽度等静态配置，无任何逻辑副作用。
 */

/** 面板固定宽度 */
export const PANEL_WIDTH = '420px';

/** 事件类型中文映射 */
export const EVENT_TYPE_MAP: Record<string, string> = {
  birth: '新生',
  death: '解散',
  split: '分裂',
  merge: '合并',
  growth: '成长',
  shrink: '衰退',
};

/** 事件颜色映射 */
export const EVENT_COLOR_MAP: Record<string, string> = {
  birth: '#22c55e', // green-500
  death: '#ef4444', // red-500
  split: '#f59e0b', // amber-500
  merge: '#8b5cf6', // violet-500
  growth: '#3b82f6', // blue-500
  shrink: '#f97316', // orange-500
};

/** 事件类型颜色（用于测试，data-event-color 属性） */
export const EVENT_COLOR_TEST_MAP: Record<string, string> = {
  birth: 'green',
  death: 'red',
  split: 'amber',
  merge: 'violet',
  growth: 'blue',
  shrink: 'orange',
};
