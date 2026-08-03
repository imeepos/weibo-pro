/**
 * 图表常用常量
 */

/**
 * 默认颜色调色板
 */
export const DEFAULT_COLORS = [
  '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff',
  '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe',
  '#10b981', '#34d399', '#6ee7b7', '#9deccd', '#a7f3d0',
  '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7',
  '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'
];

/**
 * 主题相关常量
 */
export const CHART_THEMES = {
  light: {
    backgroundColor: '#ffffff',
    textColor: '#374151',
    gridColor: '#e5e7eb',
    colors: DEFAULT_COLORS
  },
  dark: {
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    gridColor: '#374151',
    colors: DEFAULT_COLORS
  }
} as const;

/**
 * 图表尺寸常量
 */
export const CHART_SIZES = {
  small: { height: 200, width: 300 },
  medium: { height: 300, width: 400 },
  large: { height: 400, width: 600 },
  xlarge: { height: 500, width: 800 }
} as const;
