import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLogger } from '@sker/core';
import { root } from '@sker/core';
import { EventsController } from '@sker/sdk';
import type { TrendDataSeries } from '@sker/sdk';
import { useDebounce } from '@sker/ui/hooks/use-debounce';
import { useAppStore } from '@/stores/useAppStore';
import type { EventItem } from '@/types';
import { computeStats, extractTrendSeries } from './utils';
import type { EventStats, TrendSeries } from './types';

const logger = createLogger('EventAnalysis');

export interface EventAnalysisData {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  categories: string[];
  events: EventItem[];
  setEvents: Dispatch<SetStateAction<EventItem[]>>;
  trendSeries: TrendSeries;
  stats: EventStats;
  loading: boolean;
  isRefreshing: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  total: number;
  totalPages: number;
  loadData: (showRefresh?: boolean) => Promise<void>;
  handleEventClick: (eventId: string) => void;
}

export const useEventAnalysisData = (): EventAnalysisData => {
  const navigate = useNavigate();
  const { selectedTimeRange } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [trendData, setTrendData] = useState<TrendDataSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 加载数据
  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);

      const c = root.get(EventsController);
      const search = debouncedSearchTerm || undefined;
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;

      const [eventsResult, categoriesResult, trendsResult] = await Promise.all([
        c.getEventList(selectedTimeRange, `${currentPage}`, `${pageSize}`, search, category),
        c.getEventCategories(selectedTimeRange),
        c.getTrendData(selectedTimeRange),
      ]);

      const eventsArray = Array.isArray(eventsResult.data) ? eventsResult.data : [];
      const categoriesArray = Array.isArray(categoriesResult) ? categoriesResult : [];

      setEvents(eventsArray);
      setTotal(eventsResult.total);
      setCategories(['all', ...categoriesArray.map((cat) => cat.name)]);
      setTrendData(trendsResult);
    } catch (error) {
      logger.error('Failed to load events data:', error);
      setEvents([]);
      setTotal(0);
      setCategories(['all']);
      setTrendData(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTimeRange, currentPage, pageSize, debouncedSearchTerm, selectedCategory]);

  // 筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory, selectedTimeRange]);

  // 提取趋势数据
  const trendSeries = useMemo(() => extractTrendSeries(trendData), [trendData]);

  // 统计数据 - 使用后端返回的累计总数，而不是趋势数据的最后一个点
  const stats = useMemo(() => computeStats(trendData, trendSeries), [trendData, trendSeries]);

  const totalPages = Math.ceil(total / pageSize);

  const handleEventClick = (eventId: string) => {
    navigate(`/event-analysis/${eventId}`);
  };

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    categories,
    events,
    setEvents,
    trendSeries,
    stats,
    loading,
    isRefreshing,
    currentPage,
    setCurrentPage,
    total,
    totalPages,
    loadData,
    handleEventClick,
  };
};
