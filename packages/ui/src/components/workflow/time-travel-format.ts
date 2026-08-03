'use client'

import type { TimeTravelEvent } from './time-travel-events.js'

/** 获取事件类型中文名称 */
export const getEventTypeLabel = (type: TimeTravelEvent['type']) => {
  const labels = {
    node_success: '成功',
    node_fail: '失败',
    node_runing: '运行中',
    node_emit: '发射数据',
    node_delta: '流式输出',
    node_progress: '执行进度',
  }
  return labels[type] || '未知'
}

/** 获取事件类型颜色 */
export const getEventTypeColor = (type: TimeTravelEvent['type']) => {
  const colors = {
    node_success: 'text-green-600 dark:text-green-400',
    node_fail: 'text-destructive',
    node_runing: 'text-blue-600 dark:text-blue-400',
    node_emit: 'text-purple-600 dark:text-purple-400',
    node_delta: 'text-yellow-600 dark:text-yellow-400',
    node_progress: 'text-orange-600 dark:text-orange-400',
  }
  return colors[type] || 'text-muted-foreground'
}

/** 渲染当前事件数据摘要 */
export const renderData = (currentEvent: TimeTravelEvent) => {
  switch (currentEvent.type) {
    case 'node_delta':
      return currentEvent.data.accumulated;
    case 'node_emit':
      return JSON.stringify(currentEvent.data).substring(0, 80);
    case 'node_fail':
      return currentEvent.error || '未知错误';
    case 'node_progress':
      return currentEvent.data.message;
    case 'node_runing':
      return `开始运行`;
    case 'node_success':
      return `运行成功`;
    default:
      return `未知类型`
  }
}
