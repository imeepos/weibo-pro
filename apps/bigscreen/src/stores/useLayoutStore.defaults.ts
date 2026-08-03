import type { LayoutConfig, WidgetConfig } from './useLayoutStore.types';

// 默认可用组件
export const defaultWidgets: WidgetConfig[] = [
  {
    id: 'sentiment-trend',
    name: '情感趋势图',
    component: 'SentimentTrendChart',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
    category: 'analytics',
    description: '显示舆情情感随时间变化的趋势分析',
    icon: '📈',
    defaultProps: { height: 300 }
  },
  {
    id: 'word-cloud',
    name: '词云图',
    component: 'WordCloudChart',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
    category: 'analytics',
    description: '关键词频次分布可视化，展现热点话题',
    icon: '☁️',
    defaultProps: { height: 300, maxWords: 100 }
  },
  {
    id: 'geographic-chart',
    name: '地理分布图',
    component: 'GeographicChart',
    defaultSize: { w: 8, h: 6 },
    minSize: { w: 6, h: 4 },
    maxSize: { w: 12, h: 10 },
    category: 'geographic',
    description: '展示事件或用户的地理位置分布情况',
    icon: '🗺️',
    defaultProps: { height: 300 }
  },
  {
    id: 'hot-events',
    name: '热点事件',
    component: 'HotEventsList',
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
    maxSize: { w: 8, h: 12 },
    category: 'events',
    description: '实时热点事件列表，按热度排序展示',
    icon: '🔥',
    defaultProps: {}
  },
  {
    id: 'stats-overview',
    name: '数据概览',
    component: 'StatsOverview',
    defaultSize: { w: 12, h: 2 },
    minSize: { w: 6, h: 2 },
    maxSize: { w: 12, h: 4 },
    category: 'overview',
    description: '关键指标概览面板，显示核心数据统计',
    icon: '📊',
    defaultProps: {}
  }
];

// 默认布局
export const defaultLayout: LayoutConfig = {
  id: 'default',
  name: '默认布局',
  description: '系统默认仪表板布局',
  cols: 12,
  rowHeight: 100,
  gap: 16,
  items: [
    {
      id: 'stats-1',
      x: 0, y: 0, w: 12, h: 2,
      component: 'StatsOverview',
      props: {}
    },
    {
      id: 'sentiment-1',
      x: 0, y: 2, w: 6, h: 4,
      component: 'SentimentTrendChart',
      props: {}
    },
    {
      id: 'wordcloud-1',
      x: 6, y: 2, w: 6, h: 4,
      component: 'WordCloudChart',
      props: {}
    },
    {
      id: 'geographic-1',
      x: 0, y: 6, w: 8, h: 6,
      component: 'GeographicChart',
      props: {}
    },
    {
      id: 'events-1',
      x: 8, y: 6, w: 4, h: 6,
      component: 'HotEventsList',
      props: {}
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
