import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  RealTimeData,
  SystemStatus,
  DashboardConfig,
  AppError,
  StatisticsData,
  HotTopic,
  KeywordData,
  TimeSeriesData,
  LocationData,
  SentimentData
} from '@/types';
import type { TimeRange } from '@sker/entities';

interface AppState {
  // 数据状态
  realTimeData: RealTimeData | null;
  systemStatus: SystemStatus;
  dashboardConfig: DashboardConfig;
  
  // UI 状态
  isLoading: boolean;
  error: AppError | null;
  selectedTimeRange: TimeRange;
  
  // WebSocket 状态
  isConnected: boolean;
  connectionRetries: number;
  
  // Actions
  setRealTimeData: (data: RealTimeData) => void;
  updateStatistics: (stats: StatisticsData) => void;
  updateHotTopics: (topics: HotTopic[]) => void;
  updateKeywords: (keywords: KeywordData[]) => void;
  updateTimeSeries: (series: TimeSeriesData[]) => void;
  updateLocations: (locations: LocationData[]) => void;
  addRecentPost: (post: SentimentData) => void;
  
  setSystemStatus: (status: SystemStatus) => void;
  setDashboardConfig: (config: Partial<DashboardConfig>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  setSelectedTimeRange: (range: TimeRange) => void;
  setConnectionStatus: (connected: boolean) => void;
  incrementRetries: () => void;
  resetRetries: () => void;
  
  // 清理数据
  clearData: () => void;
  // 重置状态
  reset: () => void;
}

const initialSystemStatus: SystemStatus = {
  isOnline: false,
  lastUpdate: new Date().toISOString(),
  dataSource: {
    weibo: false,
    zhihu: false,
    news: false,
  },
  performance: {
    cpu: 0,
    memory: 0,
    network: 0,
  },
};

const initialDashboardConfig: DashboardConfig = {
  layout: 'grid',
  refreshInterval: 30000, // 30 seconds
  autoRefresh: true,
  theme: 'light', // 默认使用亮色主题
};

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, _get) => ({
    // 初始状态
    realTimeData: null,
    systemStatus: initialSystemStatus,
    dashboardConfig: initialDashboardConfig,
    isLoading: false,
    error: null,
    selectedTimeRange: 'all',
    isConnected: false,
    connectionRetries: 0,

    // Actions
    setRealTimeData: (data) => set({ realTimeData: data }),
    
    updateStatistics: (stats) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        statistics: stats,
      } : null,
    })),
    
    updateHotTopics: (topics) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        hotTopics: topics,
      } : null,
    })),
    
    updateKeywords: (keywords) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        keywords,
      } : null,
    })),
    
    updateTimeSeries: (series) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        timeSeries: series,
      } : null,
    })),
    
    updateLocations: (locations) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        locations,
      } : null,
    })),
    
    addRecentPost: (post) => set((state) => ({
      realTimeData: state.realTimeData ? {
        ...state.realTimeData,
        recentPosts: [post, ...state.realTimeData.recentPosts.slice(0, 49)], // 保持最新50条
      } : null,
    })),
    
    setSystemStatus: (status) => set({ systemStatus: status }),
    setDashboardConfig: (config) => set((state) => ({
      dashboardConfig: { ...state.dashboardConfig, ...config },
    })),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
    setConnectionStatus: (connected) => set({ isConnected: connected }),
    incrementRetries: () => set((state) => ({ connectionRetries: state.connectionRetries + 1 })),
    resetRetries: () => set({ connectionRetries: 0 }),
    
    clearData: () => set({
      realTimeData: null,
      error: null,
      isLoading: false,
    }),
    
    reset: () => set({
      realTimeData: null,
      systemStatus: initialSystemStatus,
      dashboardConfig: initialDashboardConfig,
      isLoading: false,
      error: null,
      selectedTimeRange: 'all',
      isConnected: false,
      connectionRetries: 0,
    }),
  }))
);

// ============================================
// 细粒度 Selector Hooks - 避免不必要的重渲染
// ============================================

/** 仅订阅统计数据 */
export const useStatistics = () => useAppStore((state) => state.realTimeData?.statistics ?? null);

/** 仅订阅热点话题 */
export const useHotTopics = () => useAppStore((state) => state.realTimeData?.hotTopics ?? []);

/** 仅订阅关键词数据 */
export const useKeywords = () => useAppStore((state) => state.realTimeData?.keywords ?? []);

/** 仅订阅时间序列数据 */
export const useTimeSeries = () => useAppStore((state) => state.realTimeData?.timeSeries ?? []);

/** 仅订阅位置数据 */
export const useLocations = () => useAppStore((state) => state.realTimeData?.locations ?? []);

/** 仅订阅最近帖子 */
export const useRecentPosts = () => useAppStore((state) => state.realTimeData?.recentPosts ?? []);

/** 仅订阅系统状态 */
export const useSystemStatus = () => useAppStore((state) => state.systemStatus);

/** 仅订阅仪表盘配置 */
export const useDashboardConfig = () => useAppStore((state) => state.dashboardConfig);

/** 仅订阅加载状态 */
export const useIsLoading = () => useAppStore((state) => state.isLoading);

/** 仅订阅错误状态 */
export const useError = () => useAppStore((state) => state.error);

/** 仅订阅连接状态 */
export const useConnectionStatus = () => useAppStore((state) => state.isConnected);

/** 仅订阅时间范围 */
export const useSelectedTimeRange = () => useAppStore((state) => state.selectedTimeRange);

/** 订阅多个状态（使用 shallow 比较） */
export const useAppStoreShallow = <T>(selector: (state: AppState) => T) =>
  useAppStore(useShallow(selector));

/** 仅订阅 actions（不会触发重渲染） */
export const useAppActions = () => useAppStore(useShallow((state) => ({
  setRealTimeData: state.setRealTimeData,
  updateStatistics: state.updateStatistics,
  updateHotTopics: state.updateHotTopics,
  updateKeywords: state.updateKeywords,
  updateTimeSeries: state.updateTimeSeries,
  updateLocations: state.updateLocations,
  addRecentPost: state.addRecentPost,
  setSystemStatus: state.setSystemStatus,
  setDashboardConfig: state.setDashboardConfig,
  setLoading: state.setLoading,
  setError: state.setError,
  setSelectedTimeRange: state.setSelectedTimeRange,
  setConnectionStatus: state.setConnectionStatus,
  incrementRetries: state.incrementRetries,
  resetRetries: state.resetRetries,
  clearData: state.clearData,
  reset: state.reset,
})));
