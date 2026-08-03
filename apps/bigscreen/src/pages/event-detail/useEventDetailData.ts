import { useCallback, useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { createLogger, root } from '@sker/core';
import { EventsController } from '@sker/sdk';
import type { UserRelationNetwork } from '@sker/sdk';
import { createInitialTabsState } from '@/types/tab-loading';
import type { TabId, TabsDataManager } from '@/types/tab-loading';
import type { EventDetailData, GeographicDataPoint, TimeSeriesDataPoint, TrendChartData } from './types';
import {
  convertEventData,
  convertKeywords,
  convertTimeSeries,
  convertTrendData,
  type EngagementTrendItem,
  type KeywordItem,
} from './utils';
import { useEventWidgets } from './useEventWidgets';
import { loadDataForTab as loadDataForTabImpl } from './useEventDetailData.loaders';

const logger = createLogger('EventDetail');

export function useEventDetailData(eventId: string | undefined, navigate: NavigateFunction) {
  const [eventData, setEventData] = useState<EventDetailData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [trendData, setTrendData] = useState<TrendChartData | null>(null);
  const [userRelationNetwork, setUserRelationNetwork] = useState<UserRelationNetwork | null>(null);
  const [geographicData, setGeographicData] = useState<GeographicDataPoint[]>([]);
  const [geographicStats, setGeographicStats] = useState<{ totalPosts?: number; totalUsers?: number; totalRegions?: number }>({});
  const [keywordData, setKeywordData] = useState<KeywordItem[]>([]);
  const [engagementTrendData, setEngagementTrendData] = useState<EngagementTrendItem[]>([]);
  const [communityData, setCommunityData] = useState<any>(null);
  // P3 组件数据 state
  const [propagationVelocityData, setPropagationVelocityData] = useState<any>(null);
  const [influencePredictionData, setInfluencePredictionData] = useState<any>(null);
  const [communityEvolutionData, setCommunityEvolutionData] = useState<any>(null);
  // P1 组件数据 state
  const [userStratificationData, setUserStratificationData] = useState<any>(null);
  const [commentDepthData, setCommentDepthData] = useState<any>(null);
  const [postingTimeData, setPostingTimeData] = useState<any>(null);
  const [_networkCentralityData, setNetworkCentralityData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  // Tab 懒加载状态管理
  const [tabsState, setTabsState] = useState<TabsDataManager>(createInitialTabsState());

  const {
    overviewWidgets,
    trendWidgets,
    opinionWidgets,
    userAnalysisWidgets,
    sentimentWidgets,
    loadOverviewPhase2Widgets,
    loadTrendWidgets,
    loadOpinionWidgets,
    loadUserAnalysisWidgets,
    loadSentimentWidgets,
    resetAllWidgets,
  } = useEventWidgets(eventId);

  const updateEventKeywords = useCallback((keywords: string[]) => {
    setEventData(prev => (prev ? { ...prev, keywords } : prev));
  }, []);

  // 按 Tab 加载数据
  const loadDataForTab = useCallback(async (tabId: TabId) => {
    if (!eventId) return;
    await loadDataForTabImpl(tabId, {
      eventId,
      userRelationNetwork,
      communityData,
      geographicData,
      propagationVelocityData,
      influencePredictionData,
      communityEvolutionData,
      userStratificationData,
      postingTimeData,
      commentDepthData,
      setUserRelationNetwork,
      setCommunityData,
      setGeographicData,
      setGeographicStats,
      setPropagationVelocityData,
      setInfluencePredictionData,
      setCommunityEvolutionData,
      setUserStratificationData,
      setPostingTimeData,
      setCommentDepthData,
      loadTrendWidgets,
      loadOpinionWidgets,
      loadUserAnalysisWidgets,
      loadSentimentWidgets,
    });
  }, [eventId, userRelationNetwork, communityData, geographicData, loadTrendWidgets, loadOpinionWidgets, loadUserAnalysisWidgets, loadSentimentWidgets, propagationVelocityData, influencePredictionData, communityEvolutionData, userStratificationData, postingTimeData, commentDepthData]);

  // Tab 懒加载核心逻辑
  const loadTabData = useCallback(async (tabId: TabId, force = false) => {
    // 检查缓存
    if (!force && tabsState[tabId].loadingState === 'success') {
      return; // 已加载，跳过
    }

    // 检查是否正在加载
    if (tabsState[tabId].loadingState === 'loading') {
      return; // 正在加载，避免重复请求
    }

    // 更新为加载中
    setTabsState(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], loadingState: 'loading', error: null }
    }));

    try {
      // 根据 Tab ID 加载对应数据
      await loadDataForTab(tabId);

      // 更新为成功
      setTabsState(prev => ({
        ...prev,
        [tabId]: { loadingState: 'success', error: null, lastLoadedAt: Date.now() }
      }));
    } catch (error) {
      logger.error(`Failed to load tab data for ${tabId}:`, error);
      // 更新为失败
      setTabsState(prev => ({
        ...prev,
        [tabId]: { loadingState: 'error', error: error as Error, lastLoadedAt: null }
      }));
    }
  }, [tabsState, loadDataForTab]);

  const fetchEventData = useCallback(async (showRefresh = false) => {
    if (!eventId) {
      navigate('/event-analysis');
      return;
    }
    try {
      if (showRefresh) setIsRefreshing(true);
      const c = root.get(EventsController)

      // P0: 只加载基础数据和 overview Tab 数据
      const [eventData, timeSeriesData, trendData, keywordsData] = await Promise.all([
        c.getEventDetail(eventId),
        c.getEventTimeSeries(eventId),
        c.getEventTrends(eventId),
        c.getEventKeywords(eventId),
      ]);

      // 转换事件基础数据
      setEventData(convertEventData(eventData));

      // 转换时间序列数据
      setTimeSeriesData(convertTimeSeries(timeSeriesData));

      // 转换趋势数据
      setTrendData(convertTrendData(trendData));

      // 转换关键词数据
      setKeywordData(convertKeywords(keywordsData));

      // P0: overview Tab 的额外数据（可选）
      try {
        setEngagementTrendData(await c.getEngagementTrend(eventId) || []);
      } catch (e) {
        logger.warn('Failed to fetch engagement trend:', e);
      }

      await loadOverviewPhase2Widgets();

      // 标记 overview 为已加载
      setTabsState(prev => ({
        ...prev,
        overview: { loadingState: 'success', error: null, lastLoadedAt: Date.now() }
      }));

      // 如果当前 Tab 不是 overview，加载当前 Tab 数据
      if (activeTab !== 'overview') {
        await loadTabData(activeTab);
      }
    } catch (error) {
      logger.error('Failed to fetch event data:', error);
      setTabsState(prev => ({
        ...prev,
        overview: { loadingState: 'error', error: error as Error, lastLoadedAt: null }
      }));
    } finally {
      setIsRefreshing(false);
    }
  }, [eventId, navigate, activeTab, loadOverviewPhase2Widgets, loadTabData]);

  // Tab 切换处理
  const handleTabChange = useCallback((newTab: string) => {
    const tabId = newTab as TabId;
    setActiveTab(tabId);
    loadTabData(tabId);
  }, [loadTabData]);

  useEffect(() => { fetchEventData(); }, [eventId]);

  const clearEventLocalCache = useCallback(() => {
    try {
      const cacheKey = 'user_relation_network_cache';
      localStorage.removeItem(cacheKey);
      logger.info(`Local cache cleared: ${cacheKey}`);
    } catch (error) {
      // 静默处理 localStorage 错误（如隐私模式、配额超限等）
      logger.warn('Failed to clear local cache:', error);
    }
  }, []);

  const handleRefreshCache = useCallback(async () => {
    if (!eventId) return;
    setIsRefreshingCache(true);
    try {
      // 先清理本地 localStorage 缓存
      clearEventLocalCache();

      const c = root.get(EventsController);
      const result = await c.refreshCache(eventId);
      logger.info('Cache refreshed successfully', result);

      // 保存当前的 activeTab
      const currentTab = activeTab;

      // 清除所有数据状态
      setUserRelationNetwork(null);
      setGeographicData([]);
      setCommunityData(null);
      resetAllWidgets();
      setPropagationVelocityData(null);
      setInfluencePredictionData(null);
      setCommunityEvolutionData(null);
      setUserStratificationData(null);
      setCommentDepthData(null);
      setPostingTimeData(null);
      setNetworkCentralityData(null);

      // 清除所有 Tab 的加载状态
      setTabsState(createInitialTabsState());

      // 切换到 overview Tab，避免在当前 Tab 状态不一致时重新加载
      setActiveTab('overview');

      // 清除缓存后，重新加载基础数据
      await fetchEventData(true);

      // 如果之前不在 overview Tab，切换回去并重新加载该 Tab 数据
      if (currentTab !== 'overview') {
        setActiveTab(currentTab);
        // 使用 setTimeout 确保状态更新完成后再加载 Tab 数据
        setTimeout(() => {
          loadTabData(currentTab, true);
        }, 0);
      }
    } catch (error) {
      logger.error('Failed to refresh cache:', error);
    } finally {
      setIsRefreshingCache(false);
    }
  }, [eventId, activeTab, clearEventLocalCache, resetAllWidgets, fetchEventData, loadTabData]);

  return {
    eventData,
    timeSeriesData,
    trendData,
    userRelationNetwork,
    geographicData,
    geographicStats,
    keywordData,
    engagementTrendData,
    communityData,
    propagationVelocityData,
    influencePredictionData,
    communityEvolutionData,
    userStratificationData,
    commentDepthData,
    postingTimeData,
    activeTab,
    setActiveTab,
    isRefreshing,
    isRefreshingCache,
    tabsState,
    overviewWidgets,
    trendWidgets,
    opinionWidgets,
    userAnalysisWidgets,
    sentimentWidgets,
    fetchEventData,
    loadTabData,
    handleTabChange,
    handleRefreshCache,
    loadOverviewPhase2Widgets,
    loadTrendWidgets,
    loadOpinionWidgets,
    loadUserAnalysisWidgets,
    loadSentimentWidgets,
    updateEventKeywords,
  };
}
