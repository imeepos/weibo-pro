import React from 'react';
import { RefreshCw, Link, ThumbsUp, MessageCircle, Share2, Lightbulb, Info } from 'lucide-react';
import type { UserRelationType, TimeRange } from '@sker/sdk';

interface UserRelationControlsProps {
  relationType: UserRelationType;
  onRelationTypeChange: (type: UserRelationType) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  minWeight: number;
  onMinWeightChange: (weight: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const UserRelationControls: React.FC<UserRelationControlsProps> = ({
  relationType,
  onRelationTypeChange,
  timeRange,
  onTimeRangeChange,
  minWeight,
  onMinWeightChange,
  limit,
  onLimitChange,
  onRefresh,
  isLoading = false,
}) => {
  const relationTypes: Array<{ value: UserRelationType; label: string; icon: React.ReactNode }> = [
    { value: 'comprehensive', label: '综合关系', icon: <Link className="w-4 h-4" /> },
    { value: 'like', label: '点赞', icon: <ThumbsUp className="w-4 h-4" /> },
    { value: 'comment', label: '评论', icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'repost', label: '转发', icon: <Share2 className="w-4 h-4" /> },
  ];

  const timeRanges: Array<{ value: TimeRange; label: string }> = [
    { value: '24h', label: '最近24小时' },
    { value: '7d', label: '最近7天' },
    { value: '30d', label: '最近30天' },
    { value: '90d', label: '最近90天' },
  ];

  return (
    <div className="backdrop-blur-sm bg-background/50 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">控制面板</h3>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 bg-primary hover:bg-primary/90 disabled:bg-secondary text-primary-foreground rounded-md transition-colors duration-200 flex items-center gap-2 text-sm"
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

      <div className="space-y-4">
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
                className={`px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 ${
                  relationType === type.value
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {type.icon}
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 时间范围选择 */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            时间范围
          </label>
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary transition-all text-sm"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* 最小权重 */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            最小交互次数: {minWeight}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={minWeight}
            onChange={(e) => onMinWeightChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-secondary rounded-md appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1次</span>
            <span>10次</span>
          </div>
        </div>

        {/* 节点数量限制 */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            最大节点数: {limit}
          </label>
          <input
            type="range"
            min="20"
            max="200"
            step="20"
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-secondary rounded-md appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>20个</span>
            <span>200个</span>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-secondary rounded-md p-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3" />
            使用提示
          </h4>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• 点击节点：聚焦并查看详情</li>
            <li>• 悬停节点：高亮关联关系</li>
            <li>• 拖拽节点：调整布局</li>
            <li>• 滚轮：缩放视图</li>
            <li>• 右键拖拽：旋转视角</li>
          </ul>
        </div>

        {/* 关系类型说明 */}
        <div className="bg-secondary rounded-md p-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            关系说明
          </h4>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              <span>点赞关系</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>评论关系</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>转发关系</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>综合关系</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRelationControls;
