import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Calendar, Clock, MessageSquare, Pencil, Users } from 'lucide-react';
import { Badge } from '@sker/ui/components/ui/badge';
import { Button } from '@sker/ui/components/ui/button';
import { cn, formatNumber, formatRelativeTime } from '@/utils';
import type { EventItem } from '@/types';
import { getSentimentConfig, getTrendConfig } from './utils';
import { EventTrendBars } from './EventTrendBars';
import { EditEventDialog } from './EditEventDialog';
import type { EditEventDialogApi } from './types';

export interface EventCardProps {
  event: EventItem;
  index: number;
  editDialog: EditEventDialogApi;
  onEventClick: (eventId: string) => void;
}

/** 单个事件卡片（含独立渲染的编辑弹窗） */
export const EventCard: React.FC<EventCardProps> = ({ event, index, editDialog, onEventClick }) => {
  const sentimentConfig = getSentimentConfig(event.sentiment);
  const trendConfig = getTrendConfig(event.trend);
  const TrendIcon = trendConfig.icon;

  return (
    <React.Fragment>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="group relative overflow-hidden rounded-xl bg-muted/20 border border-border/40 hover:border-primary/30 transition-all duration-300 cursor-pointer"
        onClick={() => onEventClick(event.id)}
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
                <div className={cn('flex items-center gap-1.5', sentimentConfig.color)}>
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
                {event.keywords.slice(0, 4).map((keyword) => (
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
            <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full', trendConfig.bg)}>
              <TrendIcon className={cn('w-3.5 h-3.5', trendConfig.color)} />
              <span className={cn('text-xs font-medium', trendConfig.color)}>
                {event.trend === 'up' ? '上升' : event.trend === 'down' ? '下降' : '平稳'}
              </span>
            </div>
            <EventTrendBars data={event.trendData} />
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => editDialog.openEditDialog(event, e)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Dialog 放在卡片外面，独立渲染 */}
      {editDialog.editingEventId === event.id && <EditEventDialog editDialog={editDialog} />}
    </React.Fragment>
  );
};
