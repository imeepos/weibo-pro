import React, { useState, useEffect } from 'react';
import { RefreshCw, Link, ThumbsUp, MessageCircle, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import type { UserRelationType } from '@sker/sdk';
import { EventSelector, type EventItem } from '@sker/ui/components/ui';

interface UserRelationControlsProps {
  relationType: UserRelationType;
  onRelationTypeChange: (type: UserRelationType) => void;
  eventId?: string;
  onEventIdChange?: (eventId: string | undefined) => void;
  minWeight: number;
  onMinWeightChange: (weight: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  edgeThreshold: number;
  onEdgeThresholdChange: (threshold: number) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const UserRelationControls: React.FC<UserRelationControlsProps> = ({
  relationType,
  onRelationTypeChange,
  eventId,
  onEventIdChange,
  minWeight,
  onMinWeightChange,
  limit,
  onLimitChange,
  edgeThreshold,
  onEdgeThresholdChange,
  onRefresh,
  isLoading = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('controlPanel.collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [events, setEvents] = useState<EventItem[]>([]);
  const [_selectedEvent, _setSelectedEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    localStorage.setItem('userRelation.relationType', relationType);
  }, [relationType]);

  useEffect(() => {
    localStorage.setItem('userRelation.minWeight', String(minWeight));
  }, [minWeight]);

  useEffect(() => {
    localStorage.setItem('userRelation.limit', String(limit));
  }, [limit]);

  useEffect(() => {
    localStorage.setItem('userRelation.edgeThreshold', String(edgeThreshold));
  }, [edgeThreshold]);

  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('controlPanel.collapsed', JSON.stringify(newState));
  };

  const relationTypes: Array<{ value: UserRelationType; label: string; icon: React.ReactNode }> = [
    { value: 'comprehensive', label: '综合关系', icon: <Link className="w-4 h-4" /> },
    { value: 'like', label: '点赞', icon: <ThumbsUp className="w-4 h-4" /> },
    { value: 'comment', label: '评论', icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'repost', label: '转发', icon: <Share2 className="w-4 h-4" /> },
  ];

  return (
    <div className="backdrop-blur-md bg-background/80 dark:bg-background/60 rounded-xl shadow-2xl border border-border/50">
      <div className="flex items-center justify-between p-4 pb-2 cursor-move" data-drag-handle>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">控制面板</h3>
          <button
            onClick={handleToggleCollapse}
            className="p-1 hover:bg-accent/50 rounded transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            title={isCollapsed ? '展开' : '收起'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-all duration-200 flex items-center gap-2 text-sm cursor-pointer shadow-sm hover:shadow-md"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              加载中...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              刷新数据
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 p-4 pt-2 max-h-[60vh] overflow-y-auto">
          {/* 事件选择 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              事件筛选 <span className="text-xs opacity-70">(可选)</span>
            </label>
            <EventSelector
              events={events}
              value={eventId}
              onChange={(value) => {
                const id = typeof value === 'string' ? value : value[0];
                onEventIdChange?.(id || undefined);
              }}
              onSearch={async (keyword, page) => {
                const { EventsController } = await import('@sker/sdk');
                const { root } = await import('@sker/core');
                const controller = root.get(EventsController);
                const result = await controller.getEventList(undefined, page ? `${page}` : undefined, undefined, keyword);
                const items = result.data.map(e => ({
                  id: e.id,
                  title: e.title,
                  description: e.description,
                  category: e.category ? { name: e.category } : null,
                  hotness: e.hotness,
                  occurred_at: e.occurredAt,
                  created_at: e.createdAt,
                }));
                if (page === 1) {
                  setEvents(items);
                }
                return items;
              }}
              placeholder="搜索事件..."
              debounceMs={300}
              pageSize={10}
            />
            {eventId && (
              <button
                onClick={() => onEventIdChange?.(undefined)}
                className="mt-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                清除事件筛选
              </button>
            )}
          </div>

          {/* 关系类型选择 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              关系类型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {relationTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => onRelationTypeChange(type.value)}
                  className={`px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 ${relationType === type.value
                    ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20'
                    : 'bg-accent/50 text-foreground hover:bg-accent border border-border/50'
                    }`}
                >
                  {type.icon}
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 最小权重 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              最小交互次数: <span className="text-foreground font-semibold">{minWeight}</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={minWeight}
              onChange={(e) => onMinWeightChange(parseInt(e.target.value))}
              className="w-full h-2 bg-accent/50 rounded-lg appearance-none cursor-pointer accent-primary touch-none [&::-webkit-slider-thumb]:shadow-md"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1次</span>
              <span>100次</span>
            </div>
          </div>

          {/* 节点数量限制 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              最大节点数: <span className="text-foreground font-semibold">{limit.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min="20"
              max="20000"
              step="20"
              value={limit}
              onChange={(e) => onLimitChange(parseInt(e.target.value))}
              className="w-full h-2 bg-accent/50 rounded-lg appearance-none cursor-pointer accent-primary touch-none [&::-webkit-slider-thumb]:shadow-md"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>20个</span>
              <span>20,000个</span>
            </div>
          </div>

          {/* 边显示阈值 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              边显示比例: <span className="text-foreground font-semibold">{edgeThreshold}%</span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={edgeThreshold}
              onChange={(e) => onEdgeThresholdChange(parseInt(e.target.value))}
              className="w-full h-2 bg-accent/50 rounded-lg appearance-none cursor-pointer accent-primary touch-none [&::-webkit-slider-thumb]:shadow-md"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRelationControls;
