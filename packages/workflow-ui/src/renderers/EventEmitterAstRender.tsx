import React from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { EventEmitterAst } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { Radio, Database } from 'lucide-react';
import { Progress } from '@sker/ui/components/ui/progress';

const EventEmitterPreview = ({ ast }: { ast: EventEmitterAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <Radio className="size-5 text-purple-400" />
    <div className="text-xs text-slate-300 mt-1">
      事件发射器
    </div>
  </div>
);

interface EventEmitterSettingProps {
  ast: EventEmitterAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const EventEmitterSetting: React.FC<EventEmitterSettingProps> = ({ ast, onPropertyChange }) => {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">发射间隔(毫秒)</Label>
        <Input
          type="number"
          min="0"
          value={ast.delay || 0}
          onChange={(e) => onPropertyChange?.('delay', parseInt(e.target.value) || 0)}
          className="bg-background text-foreground"
        />
        <div className="text-xs text-muted-foreground">
          每个事件发射之间的延迟时间
        </div>
      </div>
    </div>
  );
};

const EventEmitterRender: React.FC<{ ast: EventEmitterAst }> = ({ ast }) => {
  if (ast.state === 'pending') return null;

  return (
    <div className="p-4 space-y-4">
      {ast.state === 'running' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">发射进度</span>
            <span className="text-foreground font-medium">{ast.processedEvents} / {ast.totalEvents}</span>
          </div>
          <Progress value={ast.progress * 100} className="h-2" />
          {ast.eventTitle && (
            <div className="text-xs text-muted-foreground">
              当前: {ast.eventTitle}
            </div>
          )}
        </div>
      )}

      {ast.state === 'success' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Database className="size-4" />
            发射完成
          </div>
          <div className="p-3 rounded bg-slate-800/50 border border-slate-700">
            <div className="text-xs text-muted-foreground mb-1">总事件数</div>
            <div className="text-2xl font-mono text-foreground">{ast.totalEvents}</div>
          </div>
        </div>
      )}

      {ast.state === 'fail' && ast.error && (
        <div className="p-3 rounded bg-red-900/30 border border-red-700/50">
          <div className="text-xs font-medium text-red-400 mb-1">执行失败</div>
          <div className="text-xs text-red-300">{ast.error.message}</div>
        </div>
      )}
    </div>
  );
};

@Injectable()
export class EventEmitterAstRender {
  @Render(EventEmitterAst)
  render(ast: EventEmitterAst) {
    return <EventEmitterRender ast={ast} />;
  }

  @Setting(EventEmitterAst)
  setting(ast: EventEmitterAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <EventEmitterSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }

  @Preview(EventEmitterAst)
  preview(ast: EventEmitterAst) {
    return <EventEmitterPreview ast={ast} />;
  }
}
