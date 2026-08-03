import React from 'react';
import {
  BarChart3,
  PieChart,
  Activity,
  Map,
  Users,
  Calendar,
  List,
  Grid,
  TrendingUp,
  Target,
} from 'lucide-react';

export interface ComponentOption {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  preview?: React.ReactNode;
  tags: string[];
  dataTypes: string[];
  size: 'small' | 'medium' | 'large' | 'xlarge';
  minSize?: { w: number; h: number };
  defaultProps?: Record<string, any>;
}

// 可用组件库
export const availableComponents: ComponentOption[] = [
  // 图表类组件
  {
    id: 'sentiment-trend-chart',
    name: '情感趋势图',
    category: 'chart',
    description: '显示情感数据的时间序列变化',
    icon: <TrendingUp className="w-5 h-5" />,
    tags: ['趋势', '情感', '时间序列'],
    dataTypes: ['sentiment', 'time-series'],
    size: 'medium',
    minSize: { w: 3, h: 2 }
  },
  {
    id: 'sentiment-pie-chart',
    name: '情感分布饼图',
    category: 'chart',
    description: '情感分类的饼图展示',
    icon: <PieChart className="w-5 h-5" />,
    tags: ['分布', '情感', '饼图'],
    dataTypes: ['sentiment', 'distribution'],
    size: 'small',
    minSize: { w: 2, h: 2 }
  },
  {
    id: 'word-cloud',
    name: '词云图',
    category: 'chart',
    description: '热词可视化展示',
    icon: <Grid className="w-5 h-5" />,
    tags: ['词云', '热词', '文本'],
    dataTypes: ['text', 'keywords'],
    size: 'medium',
    minSize: { w: 3, h: 2 }
  },
  {
    id: 'GeographicChart',
    name: '地理图表',
    category: 'map',
    description: '交互式地理图表组件',
    icon: <Map className="w-5 h-5" />,
    tags: ['地图', '图表', '交互'],
    dataTypes: ['geographic', 'interactive'],
    size: 'large',
    minSize: { w: 3, h: 3 }
  },
  {
    id: 'event-timeline',
    name: '事件时间线',
    category: 'timeline',
    description: '事件的时间序列展示',
    icon: <Calendar className="w-5 h-5" />,
    tags: ['时间线', '事件', '历史'],
    dataTypes: ['events', 'timeline'],
    size: 'large',
    minSize: { w: 3, h: 3 }
  },
  {
    id: 'hot-events-list',
    name: '热点事件列表',
    category: 'list',
    description: '实时热点事件列表',
    icon: <List className="w-5 h-5" />,
    tags: ['列表', '事件', '实时'],
    dataTypes: ['events', 'real-time'],
    size: 'small',
    minSize: { w: 2, h: 3 }
  },
  {
    id: 'user-behavior-chart',
    name: '用户行为图',
    category: 'chart',
    description: '用户行为数据分析',
    icon: <Users className="w-5 h-5" />,
    tags: ['用户', '行为', '分析'],
    dataTypes: ['user', 'behavior'],
    size: 'medium',
    minSize: { w: 3, h: 2 }
  },
  {
    id: 'activity-heatmap',
    name: '活动热力图',
    category: 'chart',
    description: '活动频率热力图',
    icon: <Activity className="w-5 h-5" />,
    tags: ['热力图', '活动', '频率'],
    dataTypes: ['activity', 'frequency'],
    size: 'medium',
    minSize: { w: 3, h: 2 }
  },
  {
    id: 'kpi-metrics',
    name: 'KPI指标卡',
    category: 'metric',
    description: '关键指标展示卡片',
    icon: <Target className="w-5 h-5" />,
    tags: ['指标', 'KPI', '数据'],
    dataTypes: ['metrics', 'kpi'],
    size: 'small',
    minSize: { w: 2, h: 2 }
  },
  {
    id: 'data-table',
    name: '数据表格',
    category: 'table',
    description: '结构化数据表格',
    icon: <BarChart3 className="w-5 h-5" />,
    tags: ['表格', '数据', '列表'],
    dataTypes: ['tabular', 'structured'],
    size: 'xlarge',
    minSize: { w: 3, h: 3 }
  }
];

export const categoryColors: Record<string, string> = {
  'chart': 'bg-blue-100 text-blue-700 border-blue-200',
  'map': 'bg-green-100 text-green-700 border-green-200',
  'timeline': 'bg-purple-100 text-purple-700 border-purple-200',
  'list': 'bg-orange-100 text-orange-700 border-orange-200',
  'metric': 'bg-red-100 text-red-700 border-red-200',
  'table': 'bg-gray-100 text-gray-700 border-gray-200'
};

export const sizeLabels: Record<string, string> = {
  'small': '小组件',
  'medium': '中组件',
  'large': '大组件',
  'xlarge': '超大组件'
};
