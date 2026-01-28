import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  MessageSquare,
  Users,
  Heart,
  AlertTriangle,
  BarChart3,
  Clock,
  Activity,
  Zap,
  Pencil,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@sker/core';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';
import { Input } from '@sker/ui/components/ui/input';
import { Button } from '@sker/ui/components/ui/button';
import { Badge } from '@sker/ui/components/ui/badge';
import { Skeleton } from '@sker/ui/components/ui/skeleton';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import { EventItem } from '@/types';
import { EventsController, TrendDataSeries } from '@sker/sdk'
import { root } from '@sker/core'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@sker/ui/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@sker/ui/components/ui/dialog';
import { useDebounce } from '@sker/ui/hooks/use-debounce';
import { DatePicker } from '@sker/ui/components/ui/date-picker';
import { Label } from '@sker/ui/components/ui/label';

const logger = createLogger('EventAnalysis');

const EventAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTimeRange, setSelectedTimeRange } = useAppStore();
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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingKeywords, setEditingKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [editingOccurredAt, setEditingOccurredAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 加载数据
  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);

      const c = root.get(EventsController)
      const search = debouncedSearchTerm || undefined;
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;

      const [eventsResult, categoriesResult, trendsResult] = await Promise.all([
        c.getEventList(selectedTimeRange, `${currentPage}`, `${pageSize}`, search, category),
        c.getEventCategories(selectedTimeRange),
        c.getTrendData(selectedTimeRange)
      ]);

      const eventsArray = Array.isArray(eventsResult.data) ? eventsResult.data : [];
      const categoriesArray = Array.isArray(categoriesResult) ? categoriesResult : [];

      setEvents(eventsArray);
      setTotal(eventsResult.total);
      setCategories(['all', ...categoriesArray.map(cat => cat.name)]);
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
  const trendSeries = useMemo(() => {
    if (!trendData?.series) return {};
    return {
      events: trendData.series.find(s => s.name === '事件数量')?.data || [],
      posts: trendData.series.find(s => s.name === '贴子数量')?.data || [],
      users: trendData.series.find(s => s.name === '参与用户')?.data || [],
      hotness: trendData.series.find(s => s.name === '热度指数')?.data || [],
    };
  }, [trendData]);

  // 计算变化率
  const calcChange = (data: number[]): number => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  };

  // 统计数据 - 使用后端返回的累计总数，而不是趋势数据的最后一个点
  const stats = useMemo(() => {
    const { events: e = [], posts: p = [], users: u = [], hotness: h = [] } = trendSeries;
    return {
      totalEvents: trendData?.totals?.totalEvents ?? (e.length > 0 ? e[e.length - 1] : 0),
      totalPosts: trendData?.totals?.totalPosts ?? (p.length > 0 ? p[p.length - 1] : 0),
      totalUsers: trendData?.totals?.totalUsers ?? (u.length > 0 ? u[u.length - 1] : 0),
      avgHotness: trendData?.totals?.avgHotness ?? (h.length > 0 ? Math.round(h.reduce((sum, v) => sum + v, 0) / h.length) : 0),
      eventChange: calcChange(e),
      postChange: calcChange(p),
      userChange: calcChange(u),
      hotnessChange: calcChange(h),
    };
  }, [trendSeries, trendData]);

  const getSentimentConfig = (sentiment: EventItem['sentiment']) => {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return { color: 'text-success', label: '正面', icon: Heart };
    } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return { color: 'text-destructive', label: '负面', icon: Heart };
    }
    return { color: 'text-muted-foreground', label: '中性', icon: Minus };
  };

  const getTrendConfig = (trend: EventItem['trend']) => {
    switch (trend) {
      case 'up': return { icon: ArrowUpRight, color: 'text-green-400', bg: 'bg-green-400/10' };
      case 'down': return { icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-400/10' };
      default: return { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/30' };
    }
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event-analysis/${eventId}`);
  };

  const openEditDialog = (event: EventItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEventId(event.id);
    setEditingKeywords(event.keywords || []);
    setKeywordInput('');
    setEditingOccurredAt(event.occurredAt ? new Date(event.occurredAt) : null);
  };

  const closeEditDialog = () => {
    setEditingEventId(null);
    setEditingKeywords([]);
    setKeywordInput('');
    setEditingOccurredAt(null);
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !editingKeywords.includes(trimmed)) {
      setEditingKeywords([...editingKeywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setEditingKeywords(editingKeywords.filter(k => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const saveChanges = async () => {
    if (!editingEventId) return;
    setIsSaving(true);
    try {
      const c = root.get(EventsController);
      // 并发更新关键词和时间
      await Promise.all([
        c.updateEventKeywords(editingEventId, { keywords: editingKeywords }),
        c.updateEventOccurredAt(editingEventId, { occurredAt: editingOccurredAt?.toISOString() || null })
      ]);
      setEvents(events.map(e =>
        e.id === editingEventId
          ? { ...e, keywords: editingKeywords, occurredAt: editingOccurredAt?.toISOString() || null }
          : e
      ));
      closeEditDialog();
    } catch (error) {
      logger.error('Failed to save changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 渲染迷你趋势图
  const renderMiniChart = (data: number[] = []) => {
    if (data.length === 0) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div className="flex items-end gap-0.5 h-8 w-14">
        {data.slice(-7).map((value, index) => {
          const height = ((value - min) / range) * 100;
          return (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-primary/70 to-primary rounded-sm transition-all duration-300"
              style={{ height: `${Math.max(height, 8)}%` }}
            />
          );
        })}
      </div>
    );
  };

  // 加载状态
  if (loading) {
    return (
      <div className="space-y-6 px-6 py-6">
        {/* 头部骨架 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        {/* 列表骨架 */}
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 px-6 py-6">
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">事件分析</h1>
            <p className="text-sm text-muted-foreground">
              共 <span className="text-foreground font-medium">{total}</span> 个事件
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索框 */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder="搜索事件..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-56 bg-muted/30 border-muted hover:bg-muted/50 focus:bg-muted transition-all"
            />
          </div>

          {/* 分类筛选 */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-36 bg-muted/30 border-muted hover:bg-muted/50 focus:bg-muted transition-all">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? '全部分类' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 刷新按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="bg-muted/30 border-muted hover:bg-muted/50"
          >
            <RefreshCw className={cn("w-4 h-4 transition-transform", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* 统计概览 - 2x2 网格 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="事件总数"
          value={stats.totalEvents}
          change={stats.eventChange}
          icon={Activity}
          color="blue"
          chartComponent={<MiniTrendChart data={trendSeries.events} color="#3b82f6" type="line" />}
          className="group hover:border-primary/30 transition-all duration-300"
        />
        <MetricCard
          title="贴子总数"
          value={stats.totalPosts}
          change={stats.postChange}
          icon={MessageSquare}
          color="green"
          chartComponent={<MiniTrendChart data={trendSeries.posts} color="#10b981" type="line" />}
          className="group hover:border-primary/30 transition-all duration-300"
        />
        <MetricCard
          title="参与用户"
          value={stats.totalUsers}
          change={stats.userChange}
          icon={Users}
          color="purple"
          chartComponent={<MiniTrendChart data={trendSeries.users} color="#8b5cf6" type="line" />}
          className="group hover:border-primary/30 transition-all duration-300"
        />
        <MetricCard
          title="平均热度"
          value={stats.avgHotness}
          change={stats.hotnessChange}
          icon={Zap}
          color="red"
          chartComponent={<MiniTrendChart data={trendSeries.hotness} color="#ef4444" type="bar" />}
          className="group hover:border-primary/30 transition-all duration-300"
        />
      </div>

      {/* 事件列表 */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted/30 mb-4">
              <Filter className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">暂无事件数据</h3>
            <p className="text-sm text-muted-foreground">请尝试调整筛选条件</p>
          </div>
        ) : (
          events.map((event, index) => {
            const sentimentConfig = getSentimentConfig(event.sentiment);
            const trendConfig = getTrendConfig(event.trend);
            const TrendIcon = trendConfig.icon;

            return (
              <React.Fragment key={event.id}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.3 }}
                  className="group relative overflow-hidden rounded-xl bg-muted/20 border border-border/40 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                  onClick={() => handleEventClick(event.id)}
                >
                  {/* 悬停光效 */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
                  </div>

                  <div className="relative flex items-stretch p-4 gap-4">
                    {/* 左侧：排名和热度 */}
                    <div className="flex flex-col items-center justify-between w-20 py-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-semibold text-lg">
                        {index + 1}
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-foreground">{event.hotness}</div>
                        <div className="text-xs text-muted-foreground">热度</div>
                      </div>
                    </div>

                    {/* 中间：主要内容 */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      {/* 标题和标签 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-foreground truncate">{event.title}</h3>
                          {event.hotness >= 90 && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              热门
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {event.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{event.description}</p>
                      </div>

                      {/* 指标和关键词 */}
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        {/* 核心指标 */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{formatNumber(event.postCount)}</span>
                            <span className="text-muted-foreground text-xs">贴子</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">{formatNumber(event.userCount)}</span>
                            <span className="text-muted-foreground text-xs">用户</span>
                          </div>
                          <div className={cn("flex items-center gap-1.5", sentimentConfig.color)}>
                            <sentimentConfig.icon className="w-4 h-4" />
                            <span className="font-medium">{sentimentConfig.label}</span>
                          </div>
                        </div>

                        {/* 时间信息 */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {event.occurredAt && (
                            <div className="flex items-center gap-1" title="事件发生时间">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              <span>{formatRelativeTime(event.occurredAt)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1" title="创建时间">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatRelativeTime(event.createdAt)}</span>
                          </div>
                        </div>

                        {/* 关键词 */}
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          {event.keywords.slice(0, 4).map(keyword => (
                            <span
                              key={keyword}
                              className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                            >
                              #{keyword}
                            </span>
                          ))}
                          {event.keywords.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{event.keywords.length - 4}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：趋势图和操作 */}
                    <div className="flex flex-col items-end justify-between w-28 py-1">
                      <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full", trendConfig.bg)}>
                        <TrendIcon className={cn("w-3.5 h-3.5", trendConfig.color)} />
                        <span className={cn("text-xs font-medium", trendConfig.color)}>
                          {event.trend === 'up' ? '上升' : event.trend === 'down' ? '下降' : '平稳'}
                        </span>
                      </div>
                      {renderMiniChart(event.trendData)}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(event, e);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Dialog 放在卡片外面，独立渲染 */}
                {editingEventId === event.id && (
                  <Dialog open={true} onOpenChange={(open) => {
                    if (!open) closeEditDialog();
                  }}>
                    <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                      <DialogHeader>
                        <DialogTitle>编辑事件</DialogTitle>
                        <DialogDescription>
                          调整事件的关键字和发生时间
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* 关键词编辑 */}
                        <div className="space-y-2">
                          <Label>关键词</Label>
                          <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-muted/30 rounded-lg">
                            {editingKeywords.length > 0 ? (
                              editingKeywords.map(keyword => (
                                <span
                                  key={keyword}
                                  className="px-3 py-1 bg-primary/15 text-primary text-sm rounded-full flex items-center gap-1 group"
                                >
                                  #{keyword}
                                  <button
                                    onClick={() => {
                                      setEditingKeywords(editingKeywords.filter(k => k !== keyword))
                                    }}
                                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">暂无关键字</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="输入新关键字"
                              value={keywordInput}
                              onChange={(e) => setKeywordInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && keywordInput.trim()) {
                                  setEditingKeywords([...editingKeywords, keywordInput.trim()]);
                                  setKeywordInput('');
                                }
                              }}
                            />
                            <Button
                              variant="secondary"
                              onClick={() => {
                                if (keywordInput.trim()) {
                                  setEditingKeywords([...editingKeywords, keywordInput.trim()]);
                                  setKeywordInput('');
                                }
                              }}
                              disabled={!keywordInput.trim()}
                            >
                              添加
                            </Button>
                          </div>
                        </div>

                        {/* 事件发生时间 */}
                        <div className="space-y-2">
                          <Label>事件发生时间</Label>
                          <DatePicker
                            date={editingOccurredAt}
                            onSelect={(date) => setEditingOccurredAt(date)}
                            placeholder="选择事件发生时间"
                          />
                          <p className="text-xs text-muted-foreground">
                            设置事件的最初发生时间，用于事件溯源和分析
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={closeEditDialog}>取消</Button>
                        <Button onClick={saveChanges} disabled={isSaving}>
                          {isSaving ? '保存中...' : '保存'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination>
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); currentPage > 1 && setCurrentPage(currentPage - 1); }}
                  className={cn(
                    "transition-colors",
                    currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-muted"
                  )}
                />
              </PaginationItem>

              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                const showPages = new Set<number>();

                [1, totalPages, currentPage - 1, currentPage, currentPage + 1].forEach(p => {
                  if (p >= 1 && p <= totalPages) showPages.add(p);
                });

                const sortedPages = Array.from(showPages).sort((a, b) => a - b);

                sortedPages.forEach((page, idx) => {
                  if (idx > 0 && page - sortedPages[idx - 1] > 1) pages.push('ellipsis');
                  pages.push(page);
                });

                return pages.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => { e.preventDefault(); setCurrentPage(item); }}
                        isActive={currentPage === item}
                        className={cn(
                          "cursor-pointer transition-all",
                          currentPage === item && "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                );
              })()}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); currentPage < totalPages && setCurrentPage(currentPage + 1); }}
                  className={cn(
                    "transition-colors",
                    currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-muted"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default EventAnalysis;
