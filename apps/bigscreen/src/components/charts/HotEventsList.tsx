import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Heart,
  BarChart3,
  Eye
} from 'lucide-react';
import { cn, formatNumber } from '@/utils';
import { createLogger } from '@sker/core';
import { HotEvent } from '@/types';
import { EventsController } from '@sker/sdk';
import { root } from '@sker/core';
import { ScrollArea } from '@sker/ui/components/ui/scroll-area';
import { useAppStore } from '@/stores/useAppStore';

interface HotEventsListProps {
  className?: string;
  events?: HotEvent[] | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const logger = createLogger('HotEventsList');

const HotEventsList: React.FC<HotEventsListProps> = ({ className = '', events: externalEvents, loading: externalLoading, error: externalError, onRetry }) => {
  const navigate = useNavigate();
  const { selectedTimeRange } = useAppStore();
  const [events, setEvents] = useState<HotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [_isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (externalEvents !== undefined) {
      return;
    }

    let isCancelled = false;

    const fetchHotEvents = async (isBackgroundRefresh = false) => {
      try {
        // 如果是后台刷新且已有数据，只设置 isRefreshing
        if (isBackgroundRefresh && events.length > 0) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }

        const c = root.get(EventsController)
        const result = await c.getHotList(selectedTimeRange);

        if (isCancelled) return;

        // 确保返回的是数组并转换类型
        if (Array.isArray(result)) {
          const transformedEvents: HotEvent[] = result.map(event => ({
            id: event.id,
            title: event.title,
            postCount: event.posts || 0,
            sentiment: { positive: 0, negative: 0, neutral: 0 },
            hotness: event.heat || 0,
            trend: event.trend === 'rising' ? 'up' : event.trend === 'falling' ? 'down' : 'stable',
            trendData: []
          }));
          setEvents(transformedEvents);
        } else {
          logger.warn('Hot events data is not an array:', result);
          if (!isBackgroundRefresh) {
            setEvents([]);
          }
        }
      } catch (error) {
        logger.error('Failed to fetch hot events:', error);
        if (!isBackgroundRefresh) {
          setEvents([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchHotEvents();

    return () => {
      isCancelled = true;
    };
  }, [externalEvents, selectedTimeRange]);

  const getSentimentColor = (sentiment: HotEvent['sentiment']) => {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return 'text-success';
    } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return 'text-destructive';
    }
    return 'text-muted-foreground';
  };

  const getSentimentLabel = (sentiment: HotEvent['sentiment']) => {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return '正面';
    } else if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return '负面';
    }
    return '中性';
  };

  const getTrendIcon = (trend: HotEvent['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleEventClick = (eventId: string) => {
    // 跳转到事件分析页面
    navigate('/event-analysis', { state: { eventId } });
  };

  const renderMiniChart = (data: number[] = []) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div className="flex items-end space-x-1 h-8 w-16">
        {data.map((value, index) => {
          const height = ((value - min) / range) * 100;
          return (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-sm min-h-[2px]"
              style={{ height: `${Math.max(height, 10)}%` }}
            />
          );
        })}
      </div>
    );
  };

  const displayedEvents = externalEvents !== undefined ? (externalEvents || []) : events;
  const displayedLoading = externalLoading ?? loading;
  const displayedError = externalError ?? null;

  if (displayedLoading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (displayedError) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">数据加载失败</div>
          {onRetry ? (
            <button className="mt-2 text-xs text-primary" onClick={onRetry}>重试</button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-4 pr-4">
        {Array.isArray(displayedEvents) ? displayedEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-muted/30 hover:bg-muted/50 rounded-lg p-4 cursor-pointer transition-all duration-300"
            onClick={() => handleEventClick(event.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 max-w-[60%]">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  <h4 className="text-sm font-medium text-foreground truncate">{event.title}</h4>
                </div>

                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{formatNumber(event.postCount)}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Heart className={cn('w-3 h-3', getSentimentColor(event.sentiment))} />
                    <span className={getSentimentColor(event.sentiment)}>
                      {getSentimentLabel(event.sentiment)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <BarChart3 className="w-3 h-3" />
                    <span>{event.hotness}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {getTrendIcon(event.trend)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 flex-shrink-0">
                <div className="flex items-center justify-center">
                  {renderMiniChart(event.trendData)}
                </div>

                <div className="text-right min-w-[60px]">
                  <div className="text-lg font-bold text-foreground">{event.hotness}</div>
                  <div className="text-xs text-muted-foreground">热度</div>
                </div>

                <button className="p-2 rounded-lg hover:bg-accent transition-colors group flex-shrink-0">
                  <Eye className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )) : null}
      </div>
    </ScrollArea>
  );
};

export default HotEventsList;
