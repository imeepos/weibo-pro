import React from 'react';
import {
  Globe,
  Heart,
  Layers,
  LineChart,
  MessageSquare,
  Network,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import { TabsList, TabsTrigger } from '@sker/ui/components/ui/tabs';
import type { TabsDataManager } from '@/types/tab-loading';

interface TabNavProps {
  tabsState: TabsDataManager;
}

export function TabNav({ tabsState }: TabNavProps) {
  return (
    <TabsList className="grid w-full grid-cols-9 bg-muted/20 p-1">
      <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 gap-2">
        <Layers className="w-4 h-4" />
        <span className="hidden sm:inline">总览</span>
      </TabsTrigger>
      <TabsTrigger value="network" className="data-[state=active]:bg-primary/20 gap-2">
        <Network className="w-4 h-4" />
        <span className="hidden sm:inline">关系网络</span>
        {tabsState.network.loadingState === 'loading' && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </TabsTrigger>
      <TabsTrigger value="geographic" className="data-[state=active]:bg-primary/20 gap-2">
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">地理分布</span>
        {tabsState.geographic.loadingState === 'loading' && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </TabsTrigger>
      <TabsTrigger value="trend" className="data-[state=active]:bg-primary/20 gap-2">
        <LineChart className="w-4 h-4" />
        <span className="hidden sm:inline">趋势分析</span>
        {tabsState.trend.loadingState === 'loading' && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </TabsTrigger>
      <TabsTrigger value="opinions" className="data-[state=active]:bg-primary/20 gap-2">
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">观点汇集</span>
        {tabsState.opinions.loadingState === 'loading' && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </TabsTrigger>
      <TabsTrigger value="sentiment" className="data-[state=active]:bg-primary/20 gap-2">
        <Heart className="w-4 h-4" />
        <span className="hidden sm:inline">情感分析</span>
        {tabsState.sentiment.loadingState === 'loading' && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </TabsTrigger>
      <TabsTrigger value="advanced" className="data-[state=active]:bg-primary/20 gap-2">
        <Target className="w-4 h-4" />
        <span className="hidden sm:inline">高级分析</span>
        {tabsState.advanced.loadingState === 'loading' && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </TabsTrigger>
      <TabsTrigger value="user-analysis" className="data-[state=active]:bg-primary/20 gap-2">
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">用户分析</span>
        {tabsState['user-analysis'].loadingState === 'loading' && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </TabsTrigger>
      <TabsTrigger value="content-analysis" className="data-[state=active]:bg-primary/20 gap-2">
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">内容分析</span>
        {tabsState['content-analysis'].loadingState === 'loading' && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </TabsTrigger>
    </TabsList>
  );
}
