import React from 'react';
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
  const relationTypes: Array<{ value: UserRelationType; label: string; icon: string }> = [
    { value: 'comprehensive', label: '综合关系', icon: '🔗' },
    { value: 'like', label: '点赞', icon: '❤️' },
    { value: 'comment', label: '评论', icon: '💬' },
    { value: 'repost', label: '转发', icon: '🔄' },
  ];

  const timeRanges: Array<{ value: TimeRange; label: string }> = [
    { value: '24h', label: '最近24小时' },
    { value: '7d', label: '最近7天' },
    { value: '30d', label: '最近30天' },
    { value: '90d', label: '最近90天' },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">控制面板</h3>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              加载中...
            </>
          ) : (
            <>
              <span>🔄</span>
              刷新数据
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* 关系类型选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            关系类型
          </label>
          <div className="grid grid-cols-2 gap-3">
            {relationTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => onRelationTypeChange(type.value)}
                className={`px-4 py-3 rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2 ${
                  relationType === type.value
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 时间范围选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            时间范围
          </label>
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
          <label className="block text-sm font-medium text-gray-300 mb-3">
            最小交互次数: {minWeight}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={minWeight}
            onChange={(e) => onMinWeightChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1次</span>
            <span>10次</span>
          </div>
        </div>

        {/* 节点数量限制 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            最大节点数: {limit}
          </label>
          <input
            type="range"
            min="20"
            max="200"
            step="20"
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>20个</span>
            <span>200个</span>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">💡 使用提示</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• 点击节点：聚焦并查看详情</li>
            <li>• 悬停节点：高亮关联关系</li>
            <li>• 拖拽节点：调整布局</li>
            <li>• 滚轮：缩放视图</li>
            <li>• 右键拖拽：旋转视角</li>
          </ul>
        </div>

        {/* 关系类型说明 */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">📊 关系说明</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <span>点赞关系</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>评论关系</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>转发关系</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>综合关系</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRelationControls;
