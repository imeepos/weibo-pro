/**
 * 情感转变组件 —— 纯工具函数
 *
 * 仅包含无副作用的格式化/转换函数，便于单元测试。
 */

/** 格式化数字（添加千分位分隔符） */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

/** 格式化完整时间（含年月日时分） */
export function formatTime(timestamp: string | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 格式化短时间（仅月日时分，用于图表坐标轴） */
export function formatShortTime(timestamp: string | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
