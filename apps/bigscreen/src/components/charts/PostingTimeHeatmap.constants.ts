// 星期名称映射
export const WEEKDAY_NAME_MAP: Record<number, string> = {
  0: '周日',
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
};

// 暗色主题：从深蓝（低密度）到亮橙红（高密度）
export const HEATMAP_DARK_COLORS = [
  '#0d1b2a', // 最暗 - 几乎无数据
  '#1b263b',
  '#274060',
  '#3a5a7c',
  '#4a7c9b',
  '#5c9eba',
  '#7ec8e3',
  '#ffd166', // 中等
  '#f4a261',
  '#e76f51',
  '#e63946', // 最亮 - 高峰值
];

// 亮色主题：从浅灰（低密度）到深红（高密度）
export const HEATMAP_LIGHT_COLORS = [
  '#f8f9fa', // 最浅 - 几乎无数据
  '#e9ecef',
  '#dee2e6',
  '#ced4da',
  '#adb5bd',
  '#6c757d',
  '#495057',
  '#f4a261', // 中等
  '#e76f51',
  '#d62828',
  '#9d0208', // 最深 - 高峰值
];
