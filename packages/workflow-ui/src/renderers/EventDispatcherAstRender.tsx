import React from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { EventDispatcherAst } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { cn } from '@sker/ui/lib/utils';
import { List } from 'lucide-react';

const EventDispatcherPreview = ({ ast }: { ast: EventDispatcherAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <List className="size-5 text-purple-400" />
    <div className="text-xs text-slate-300 mt-1">
      {ast.limit > 0 ? `限制 ${ast.limit} 个事件` : '所有事件'}
    </div>
  </div>
);

interface EventDispatcherSettingProps {
  ast: EventDispatcherAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const EventDispatcherSetting: React.FC<EventDispatcherSettingProps> = ({ ast, onPropertyChange }) => {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">自定义提示词</Label>
        <textarea
          className={cn(
            "w-full min-h-[100px] p-2 rounded-md border text-sm",
            "bg-background text-foreground"
          )}
          placeholder="输入自定义提示词..."
          value={ast.customPrompt || ''}
          onChange={(e) => onPropertyChange?.('customPrompt', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">限制返回数量</Label>
        <Input
          type="number"
          min="0"
          placeholder="0 表示不限制"
          value={ast.limit || 0}
          onChange={(e) => onPropertyChange?.('limit', parseInt(e.target.value) || 0)}
          className="bg-background text-foreground"
        />
        <div className="text-xs text-muted-foreground">
          设置为 0 表示返回所有事件
        </div>
      </div>
    </div>
  );
};

const EventDispatcherRender: React.FC<{ ast: EventDispatcherAst }> = ({ ast }) => {
  if (ast.state === 'pending') return null;

  return (
    <div className="p-4 space-y-3">
      {ast.selectedEventId && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">选中的事件</div>
          <div className="p-2 rounded-lg bg-accent/50 border border-border">
            <div className="text-sm font-medium text-foreground">
              {ast.selectedEvent?.title || ast.selectedEventId}
            </div>
            {ast.selectedEvent?.category && (
              <div className="text-xs text-muted-foreground mt-1">
                分类：{ast.selectedEvent.category}
              </div>
            )}
            {ast.selectedEvent?.hotness !== undefined && (
              <div className="text-xs text-muted-foreground">
                热度：{ast.selectedEvent.hotness}
              </div>
            )}
          </div>
        </div>
      )}

      {ast.eventsList.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            事件列表（前 5 个）
          </div>
          <div className="space-y-1">
            {ast.eventsList.slice(0, 5).map((event, index) => (
              <div
                key={event.id || index}
                className="p-2 rounded bg-accent/30 border border-border text-xs"
              >
                <div className="font-medium text-foreground">{event.title}</div>
                {event.category && (
                  <div className="text-muted-foreground mt-0.5">
                    {event.category}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 text-xs">
        <div className="space-y-1">
          <div className="text-muted-foreground">事件总数</div>
          <div className="font-mono px-2 py-1 rounded bg-blue-900/30 text-blue-400">
            {ast.totalEvents}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">未爬取数量</div>
          <div className="font-mono px-2 py-1 rounded bg-orange-900/30 text-orange-400">
            {ast.uncrawledCount}
          </div>
        </div>
      </div>
    </div>
  );
};

@Injectable()
export class EventDispatcherAstRender {
  @Render(EventDispatcherAst)
  render(ast: EventDispatcherAst) {
    return <EventDispatcherRender ast={ast} />;
  }

  @Setting(EventDispatcherAst)
  setting(ast: EventDispatcherAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <EventDispatcherSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }

  @Preview(EventDispatcherAst)
  preview(ast: EventDispatcherAst) {
    return <EventDispatcherPreview ast={ast} />;
  }
}
