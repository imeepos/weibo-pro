/**
 * Tab 懒加载相关类型定义
 */

/**
 * Tab 标识符类型
 */
export type TabId =
  | 'overview'
  | 'network'
  | 'geographic'
  | 'trend'
  | 'sentiment'
  | 'advanced'
  | 'user-analysis'
  | 'content-analysis';

/**
 * 加载状态类型
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Tab 数据状态接口
 */
export interface TabDataState {
  /** 加载状态 */
  loadingState: LoadingState;
  /** 错误信息 */
  error: Error | null;
  /** 最后加载时间戳 */
  lastLoadedAt: number | null;
}

/**
 * 所有 Tab 的状态管理
 */
export type TabsDataManager = Record<TabId, TabDataState>;

/**
 * 创建初始 Tab 状态
 */
export const createInitialTabState = (): TabDataState => ({
  loadingState: 'idle',
  error: null,
  lastLoadedAt: null,
});

/**
 * 创建初始 Tabs 状态管理器
 */
export const createInitialTabsState = (): TabsDataManager => ({
  overview: createInitialTabState(),
  network: createInitialTabState(),
  geographic: createInitialTabState(),
  trend: createInitialTabState(),
  sentiment: createInitialTabState(),
  advanced: createInitialTabState(),
  'user-analysis': createInitialTabState(),
  'content-analysis': createInitialTabState(),
});
