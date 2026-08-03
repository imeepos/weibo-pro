import { type GridItem } from '../components/layout/index';

export interface LayoutArea {
  id: string;
  title: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  component: string | null;
  type?: 'widget' | 'container';
  placeholder?: string;
  allowedComponents?: string[];
  props?: Record<string, any>;
}

export interface LayoutConfig {
  id: string;
  name: string;
  description?: string;
  items: GridItem[];
  cols: number;
  rowHeight: number;
  gap: number;
  createdAt: string;
  updatedAt: string;
  areas?: LayoutArea[];
  thumbnail?: string;
  category?: string;
}

// Legacy type alias for backward compatibility
export type LayoutTemplate = LayoutConfig;

export interface WidgetConfig {
  id: string;
  name: string;
  component: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  category: string;
  description?: string;
  icon?: string;
  defaultProps?: Record<string, any>;
}

export interface LayoutStore {
  // 当前布局
  currentLayout: LayoutConfig | null;

  // 保存的布局列表
  savedLayouts: LayoutConfig[];

  // 可用组件库
  availableWidgets: WidgetConfig[];

  // 编辑状态
  isEditMode: boolean;

  // 操作方法
  setCurrentLayout: (layout: LayoutConfig) => void;
  updateCurrentLayout: (updates: Partial<LayoutConfig>) => void;
  saveLayout: (layout: LayoutConfig) => void;
  deleteLayout: (layoutId: string) => void;
  loadLayout: (layoutId: string) => void;

  // 组件管理
  addWidget: (widget: WidgetConfig) => void;
  removeWidget: (widgetId: string) => void;

  // 网格项操作
  addGridItem: (item: Omit<GridItem, 'id'>) => void;
  updateGridItem: (itemId: string, updates: Partial<GridItem>) => void;
  removeGridItem: (itemId: string) => void;
  updateGridItems: (items: GridItem[]) => void;

  // 编辑模式
  toggleEditMode: () => void;
  setEditMode: (isEdit: boolean) => void;

  // 导入导出
  exportLayout: (layoutId: string) => string;
  importLayout: (layoutData: string) => boolean;

  // 重置
  resetToDefault: () => void;
}
