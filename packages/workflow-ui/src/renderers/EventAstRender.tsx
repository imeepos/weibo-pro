import React from 'react';
import { Injectable, root } from '@sker/core';
import { Render, Setting } from '@sker/workflow';
import { EventAst } from '@sker/workflow-ast';
import { EventsController } from '@sker/sdk';
import { EventSelector, type EventItem } from '@sker/ui/components/ui';
import { CalendarIcon, TrendingUpIcon, TagIcon } from 'lucide-react';
import { useAsyncData } from '../hooks';

const EventRender: React.FC<{ ast: EventAst }> = ({ ast }) => {
  if (!ast.eventId) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        请在属性面板中选择事件
      </div>
    );
  }

  const event = ast.event;

  return (
    <div className="space-y-3 p-3 max-w-sm">
      {ast.eventTitle && (
        <div className="p-2 rounded-lg bg-accent/50 border border-border">
          <div className="text-sm font-medium text-foreground">{ast.eventTitle}</div>
          {ast.eventCategory && (
            <div className="text-xs text-muted-foreground mt-1">
              分类：{ast.eventCategory}
            </div>
          )}
        </div>
      )}

      {ast.keywords && ast.keywords.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <TagIcon className="size-3" />
            关键字
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ast.keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {event && (
        <>
          {event.description && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                事件描述
              </div>
              <div className="p-2 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-foreground line-clamp-3">
                  {event.description}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {event.occurred_at && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="size-3" />
                {new Date(event.occurred_at).toLocaleDateString('zh-CN')}
              </span>
            )}
            {typeof event.hotness === 'number' && (
              <span className="flex items-center gap-1">
                <TrendingUpIcon className="size-3" />
                热度 {event.hotness}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

interface EventSettingProps {
  ast: EventAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const EventSetting: React.FC<EventSettingProps> = ({ ast, onPropertyChange }) => {
  const { data: events, loading } = useAsyncData({
    fetcher: async () => {
      const controller = root.get(EventsController);
      const list = await controller.getEventList();
      return list.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category ? { name: e.category } : null,
        hotness: e.hotness,
        occurred_at: e.createdAt,
        created_at: e.createdAt,
      }));
    },
    deps: []
  });

  const handleSelect = (eventId: string | string[]) => {
    const id = Array.isArray(eventId) ? eventId[0] : eventId;
    const event = events?.find(e => e.id === id);

    if (event) {
      onPropertyChange?.('eventId', event.id);
      onPropertyChange?.('eventTitle', event.title);
      onPropertyChange?.('eventCategory', event.category?.name);
    } else {
      onPropertyChange?.('eventId', undefined);
      onPropertyChange?.('eventTitle', undefined);
      onPropertyChange?.('eventCategory', undefined);
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground text-sm">加载中...</div>;
  }

  return (
    <EventSelector
      events={events || []}
      value={ast.eventId}
      onChange={handleSelect}
      placeholder="搜索事件..."
    />
  );
};

@Injectable()
export class EventAstRender {
  @Render(EventAst)
  render(ast: EventAst) {
    return <EventRender ast={ast} />;
  }

  @Setting(EventAst)
  setting(ast: EventAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <EventSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }
}
