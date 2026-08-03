/**
 * 社区演化时间线 —— 内容列表子组件
 *
 * 仅负责展开区内的事件过滤、事件卡片/列表、时间切片摘要与关键变化等
 * 列表型区块的渲染，无业务副作用。
 */
import React from 'react';
import type { CommunityEvolutionAnalysis, EvolutionEvent } from '@sker/sdk';
import { Clock, Users } from 'lucide-react';
import {
  formatTime,
  getEventColor,
  getEventLabel,
  getEventTestColor,
  getEventTypesWithCounts,
} from './CommunityEvolutionTimeline.utils';

/** 事件过滤按钮组 */
export function EventFilterButtons({
  data,
  selected,
  onSelect,
}: {
  data: CommunityEvolutionAnalysis;
  selected: string;
  onSelect: (type: string) => void;
}) {
  const types = getEventTypesWithCounts(data.evolutionEvents);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onSelect('all')}
        className={`text-xs px-2 py-1 rounded transition-colors ${
          selected === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/70'
        }`}
        data-testid="filter-all"
      >
        全部 ({data.evolutionEvents.length})
      </button>
      {types.map(({ type, count }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            selected === type
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          }`}
          data-testid={`filter-${type}`}
        >
          {getEventLabel(type)} ({count})
        </button>
      ))}
    </div>
  );
}

/** 单条演化事件卡片 */
export function EventCard({
  event,
  index,
  onClick,
}: {
  event: EvolutionEvent;
  index: number;
  onClick: (event: EvolutionEvent) => void;
}) {
  const eventColor = getEventColor(event.type);
  const eventTypeTest = getEventTestColor(event.type);

  return (
    <div
      key={`${event.type}-${index}`}
      data-testid="evolution-event"
      data-event-type={event.type}
      data-event-color={eventTypeTest}
      className="relative p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md border-border bg-muted/30"
      onClick={() => onClick(event)}
    >
      {/* 事件头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventColor }} />
          <span className="text-sm font-semibold">{getEventLabel(event.type)}</span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(event.timestamp)}
        </div>
      </div>

      {/* 事件描述 */}
      <div className="text-xs text-muted-foreground mb-2">{event.description}</div>

      {/* 变化幅度 */}
      {event.magnitude > 0 && (
        <div className="text-xs text-muted-foreground">幅度: {event.magnitude.toFixed(2)}</div>
      )}
    </div>
  );
}

/** 演化事件列表 */
export function EventList({
  events,
  onEventClick,
}: {
  events: EvolutionEvent[];
  onEventClick?: (event: EvolutionEvent) => void;
}) {
  if (events.length === 0) {
    return <div className="text-center text-muted-foreground text-xs">无相关事件</div>;
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <EventCard
          key={`${event.type}-${index}`}
          event={event}
          index={index}
          onClick={event => onEventClick?.(event)}
        />
      ))}
    </div>
  );
}

/** 时间切片摘要 */
export function TimeSlicesSummaryPanel({ data }: { data: CommunityEvolutionAnalysis }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground mb-2">时间切片</div>
      {data.timeSlices.slice(0, 5).map((slice, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs">{formatTime(slice.timestamp)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {slice.communities.length} 个社区
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {slice.totalMembers} 成员
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 关键变化面板 */
export function KeyChangesPanel({ data }: { data: CommunityEvolutionAnalysis }) {
  if (data.keyChanges.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground mb-2">关键变化</div>
      {data.keyChanges.slice(0, 3).map((change, index) => (
        <div key={index} className="p-2 rounded bg-muted/30 border border-border">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold">{change.communityId}</span>
            <span className="text-xs text-muted-foreground">{change.changeType}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {change.beforeSize} → {change.afterSize} 成员
          </div>
        </div>
      ))}
    </div>
  );
}
