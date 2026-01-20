import React from 'react';
import { Injectable, root } from '@sker/core';
import { Render, Setting } from '@sker/workflow';
import { EventAst } from '@sker/workflow-ast';
import { EventsController } from '@sker/sdk';
import { EventSelector, type EventItem } from '@sker/ui/components/ui';
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
      const result = await controller.getEventList();
      return result.data.map(e => ({
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

  // 存储搜索结果的事件，用于 handleSelect 查找
  const searchResultsRef = React.useRef<Map<string, EventItem>>(new Map());

  const handleSearch = async (keyword: string, page?: number) => {
    const controller = root.get(EventsController);
    const result = await controller.getEventList(undefined, page ? `${page}` : undefined, undefined, keyword);
    const items = result.data.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category ? { name: e.category } : null,
      hotness: e.hotness,
      occurred_at: e.createdAt,
      created_at: e.createdAt,
    }));
    // 缓存搜索结果
    items.forEach(item => searchResultsRef.current.set(item.id, item));
    return items;
  };

  const handleSelect = (eventId: string | string[]) => {
    const id = Array.isArray(eventId) ? eventId[0] : eventId;
    if (!id) {
      onPropertyChange?.('eventId', undefined);
      onPropertyChange?.('eventTitle', undefined);
      onPropertyChange?.('eventCategory', undefined);
      return;
    }
    // 先从原始列表查找，再从搜索结果中查找
    const event = events?.find(e => e.id === id) || searchResultsRef.current.get(id);

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
      onSearch={handleSearch}
      placeholder="搜索事件..."
      debounceMs={300}
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
