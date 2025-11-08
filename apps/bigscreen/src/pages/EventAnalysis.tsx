import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  MessageSquare,
  Users,
  Heart,
  Eye,
  AlertTriangle,
  BarChart3,
  Clock
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import { createLogger } from '@/utils/logger';
import MetricCard from '@/components/ui/MetricCard';
import Select from '@/components/ui/Select';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import { EventItem, TrendData } from '@/types';
import { EventsAPI } from '@/services/api';


const logger = createLogger('EventAnalysis');

const EventAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTimeRange } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [eventsResult, categoriesResult, trendsResult] = await Promise.all([
          EventsAPI.getEventsList({ timeRange: selectedTimeRange }),
          EventsAPI.getCategories(selectedTimeRange),
          EventsAPI.getTrendData(selectedTimeRange)
        ]);

        console.log({
          eventsResult,
          categoriesResult,
          trendsResult
        })

        // 确保数据为数组
        const eventsArray = Array.isArray(eventsResult) ? eventsResult : [];
        const categoriesArray = Array.isArray(categoriesResult) ? categoriesResult : [];

        setEvents(eventsArray);

        // 转换 EventCategory[] 为 string[]
        const categoryNames = ['all', ...categoriesArray.map(cat => cat.name)];
        setCategories(categoryNames);

        setTrendData(trendsResult);
      } catch (error) {
        logger.error('Failed to load events data:', error);
        // 设置默认值以防止UI崩溃
        setEvents([]);
        setCategories(['all']);
        setTrendData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedTimeRange]);

  const filteredEvents = Array.isArray(events) ? events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) : [];

  const getSentimentColor = (sentiment: EventItem['sentiment']) => {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return 'text-success';
    } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return 'text-destructive';
    }
    return 'text-muted-foreground';
  };

  const getTrendIcon = (trend: EventItem['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
    }
  };
  console.log({ filteredEvents })
  // 计算统计数据
  const totalEvents = filteredEvents.length;
  const totalPosts = filteredEvents.reduce((sum, event) => sum + event.postCount, 0);
  const totalUsers = filteredEvents.reduce((sum, event) => sum + event.userCount, 0);
  const avgHotness = filteredEvents.length > 0 ?
    Math.round(filteredEvents.reduce((sum, event) => sum + event.hotness, 0) / filteredEvents.length) : 0;

  // 从 mock 服务获取趋势数据
  const eventTrendData = trendData?.eventTrendData || [];
  const postTrendData = trendData?.postTrendData || [];
  const userTrendData = trendData?.userTrendData || [];
  const hotnessTrendData = trendData?.hotnessData || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const handleEventClick = (eventId: string) => {
    navigate(`/event-analysis/${eventId}`);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* 页面标题和筛选区域 - 参考 UserDetection 布局 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">事件分析面板</h1>
          <p className="text-muted-foreground mt-1">
            当前时间区间: {selectedTimeRange} | 事件监测与趋势分析
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索事件或关键词..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-muted rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          {/* 分类筛选 */}
          <Select
            className="min-w-[150px]"
            value={selectedCategory}
            onChange={(nextValue) => setSelectedCategory(nextValue)}
            options={(categories.length ? categories : ['all']).map(category => ({
              value: category,
              label: category === 'all' ? '全部分类' : category,
            }))}
            placeholder="选择分类"
          />
        </div>
      </div>

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="事件总数"
          className='sentiment-overview-card'
          value={totalEvents}
          change={12.5}
          icon="Activity"
          color="sentiment-neutral"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={eventTrendData} color="#3b82f6" type="bar" />}
        />
        <MetricCard
          title="贴子总数"
          className='sentiment-overview-card'
          value={totalPosts}
          change={8.3}
          icon="MessageSquare"
          color="sentiment-positive"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={postTrendData} color="#10b981" type="line" />}
        />
        <MetricCard
          title="参与用户"
          className='sentiment-overview-card'
          value={totalUsers}
          change={5.7}
          icon="Users"
          color="purple"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={userTrendData} color="#8b5cf6" type="line" />}
        />
        <MetricCard
          title="平均热度"
          className='sentiment-overview-card'
          value={avgHotness}
          change={15.2}
          icon="Zap"
          color="sentiment-negative"
          size="large"
          showChart={true}
          chartComponent={<MiniTrendChart data={hotnessTrendData} color="#ef4444" type="bar" />}
        />
      </div>

      {/* 事件列表 - 为列表预留充足空间 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/30 transition-colors">
          <div className="grid grid-cols-1 gap-4">
            {filteredEvents.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="text-muted-foreground text-lg">暂无事件数据</div>
                <div className="text-sm text-muted-foreground mt-2">请尝试调整筛选条件</div>
              </div>
            ) : (
              filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-4 hover:bg-card/90 transition-all duration-300 cursor-pointer"
                  onClick={() => handleEventClick(event.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-foreground">{event.title}</h3>
                        <span className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full font-medium">
                          {event.category}
                        </span>
                        {getTrendIcon(event.trend)}
                        {/* 热度等级指示器 */}
                        {event.hotness >= 90 && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            高热度
                          </span>
                        )}
                      </div>

                      <p className="text-muted-foreground mb-3 text-sm">{event.description}</p>

                      <div className="flex items-center space-x-8 text-sm">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-5 h-5 text-muted-foreground" />
                          <span className="text-foreground font-semibold">{formatNumber(event.postCount)}</span>
                          <span className="text-muted-foreground">贴子</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Users className="w-5 h-5 text-muted-foreground" />
                          <span className="text-foreground font-semibold">{formatNumber(event.userCount)}</span>
                          <span className="text-muted-foreground">用户</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <BarChart3 className="w-5 h-5 text-muted-foreground" />
                          <span className="text-foreground font-semibold">{event.hotness}</span>
                          <span className="text-muted-foreground">热度</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Heart className={cn('w-5 h-5', getSentimentColor(event.sentiment))} />
                          <span className={cn('font-semibold', getSentimentColor(event.sentiment))}>
                            {event.sentiment.positive > event.sentiment.negative ? '正面' :
                              event.sentiment.negative > event.sentiment.positive ? '负面' : '中性'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                          <span className="text-muted-foreground">{formatRelativeTime(event.lastUpdate)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-wrap gap-2">
                          {event.keywords.slice(0, 6).map(keyword => (
                            <span key={keyword} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                              #{keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="ml-8 flex flex-col items-end space-y-4">
                      <div className="text-right">
                        <div className="text-3xl font-bold text-foreground">{event.hotness}</div>
                        <div className="text-sm text-muted-foreground">热度指数</div>
                      </div>

                      {/* 热度直方图（简化版） */}
                      <div className="w-20 h-12 bg-muted/30 rounded-lg flex items-end space-x-1 p-2">
                        {[...Array(7)].map((_, i) => {
                          const height = 20 + Math.random() * 60;
                          return (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-primary/60 to-primary rounded-sm"
                              style={{ height: `${height}%` }}
                            ></div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 事件详情模态框 */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedEvent.description}</p>

              {/* 详细统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">贴子数量</div>
                  <div className="text-lg font-bold text-foreground">{formatNumber(selectedEvent.postCount)}</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">参与用户</div>
                  <div className="text-lg font-bold text-foreground">{formatNumber(selectedEvent.userCount)}</div>
                </div>
              </div>

              {/* 情感分析 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-3">情感分析</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-success">正面</span>
                    <span className="text-foreground">{selectedEvent.sentiment.positive}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-destructive">负面</span>
                    <span className="text-foreground">{selectedEvent.sentiment.negative}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">中性</span>
                    <span className="text-foreground">{selectedEvent.sentiment.neutral}%</span>
                  </div>
                </div>
              </div>

              {/* 关键词 */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">关键词</div>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.keywords.map(keyword => (
                    <span key={keyword} className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full">
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default EventAnalysis;
