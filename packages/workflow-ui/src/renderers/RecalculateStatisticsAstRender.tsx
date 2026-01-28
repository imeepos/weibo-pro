import React from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { RecalculateStatisticsAst } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { Switch } from '@sker/ui/components/ui/switch';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { Progress } from '@sker/ui/components/ui/progress';

const RecalculatePreview = ({ ast }: { ast: RecalculateStatisticsAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <RefreshCw className="size-5 text-green-400" />
    <div className="text-xs text-slate-300 mt-1">
      {ast.eventId || '未配置事件ID'}
    </div>
  </div>
);

interface RecalculateSettingProps {
  ast: RecalculateStatisticsAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const RecalculateSetting: React.FC<RecalculateSettingProps> = ({ ast, onPropertyChange }) => {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">事件ID *</Label>
        <Input
          placeholder="请输入事件ID"
          value={ast.eventId || ''}
          onChange={(e) => onPropertyChange?.('eventId', e.target.value)}
          className="bg-background text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">开始日期</Label>
        <Input
          type="datetime-local"
          value={ast.startDate ? new Date(ast.startDate).toISOString().slice(0, 16) : ''}
          onChange={(e) => onPropertyChange?.('startDate', e.target.value ? new Date(e.target.value) : null)}
          className="bg-background text-foreground"
        />
        <div className="text-xs text-muted-foreground">
          留空则从最早数据开始
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">结束日期</Label>
        <Input
          type="datetime-local"
          value={ast.endDate ? new Date(ast.endDate).toISOString().slice(0, 16) : ''}
          onChange={(e) => onPropertyChange?.('endDate', e.target.value ? new Date(e.target.value) : null)}
          className="bg-background text-foreground"
        />
        <div className="text-xs text-muted-foreground">
          留空则到当前时间
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2">
        <Label className="text-sm font-medium text-foreground">清空现有数据</Label>
        <Switch
          checked={ast.clearExisting}
          onCheckedChange={(checked) => onPropertyChange?.('clearExisting', checked)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">批处理大小</Label>
        <Input
          type="number"
          min="1"
          max="1000"
          value={ast.batchSize || 100}
          onChange={(e) => onPropertyChange?.('batchSize', parseInt(e.target.value) || 100)}
          className="bg-background text-foreground"
        />
        <div className="text-xs text-muted-foreground">
          每批处理的记录数（1-1000）
        </div>
      </div>
    </div>
  );
};

const RecalculateRender: React.FC<{ ast: RecalculateStatisticsAst }> = ({ ast }) => {
  if (ast.state === 'pending') return null;

  return (
    <div className="p-4 space-y-4">
      {ast.state === 'running' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">当前步骤</span>
            <span className="text-foreground font-medium">{ast.currentStep}</span>
          </div>
          <Progress value={ast.progress * 100} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {ast.completedSteps} / {ast.totalSteps} 步骤完成
          </div>
        </div>
      )}

      {ast.state === 'success' && ast.statistics && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BarChart3 className="size-4" />
            统计结果
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-blue-900/30 border border-blue-700/50">
              <div className="text-xs text-muted-foreground">帖子数</div>
              <div className="text-lg font-mono text-blue-400">{ast.statistics.postCount}</div>
            </div>

            <div className="p-2 rounded bg-green-900/30 border border-green-700/50">
              <div className="text-xs text-muted-foreground">评论数</div>
              <div className="text-lg font-mono text-green-400">{ast.statistics.commentCount}</div>
            </div>

            <div className="p-2 rounded bg-purple-900/30 border border-purple-700/50">
              <div className="text-xs text-muted-foreground">点赞数</div>
              <div className="text-lg font-mono text-purple-400">{ast.statistics.likeCount}</div>
            </div>

            <div className="p-2 rounded bg-orange-900/30 border border-orange-700/50">
              <div className="text-xs text-muted-foreground">转发数</div>
              <div className="text-lg font-mono text-orange-400">{ast.statistics.repostCount}</div>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-800/50 border border-slate-700">
            <div className="text-xs text-muted-foreground mb-1">去重用户数</div>
            <div className="text-2xl font-mono text-foreground">{ast.statistics.uniqueUserCount}</div>
          </div>

          <div className="text-xs text-muted-foreground">
            共处理 {ast.totalHours} 个小时的数据
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
export class RecalculateStatisticsAstRender {
  @Render(RecalculateStatisticsAst)
  render(ast: RecalculateStatisticsAst) {
    return <RecalculateRender ast={ast} />;
  }

  @Setting(RecalculateStatisticsAst)
  setting(ast: RecalculateStatisticsAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <RecalculateSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }

  @Preview(RecalculateStatisticsAst)
  preview(ast: RecalculateStatisticsAst) {
    return <RecalculatePreview ast={ast} />;
  }
}
