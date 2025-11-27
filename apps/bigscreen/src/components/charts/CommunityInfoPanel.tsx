import React from 'react';
import type { Community, InterCommunityRelation } from '@sker/ui/lib/graph-community-detector';

interface CommunityInfoPanelProps {
  communities: Community[];
  interCommunityRelations: InterCommunityRelation[];
  isOpen: boolean;
  onClose: () => void;
}

export const CommunityInfoPanel: React.FC<CommunityInfoPanelProps> = ({
  communities,
  interCommunityRelations,
  isOpen,
  onClose
}) => {
  if (!isOpen || communities.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-gray-200 max-w-80 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">社群分析</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 社群统计 */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">
          共检测到 <span className="font-semibold text-blue-600">{communities.length}</span> 个社群
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-blue-50 rounded p-2">
            <div className="text-blue-700 font-medium">最大社群</div>
            <div>{communities[0]?.size || 0} 节点</div>
          </div>
          <div className="bg-green-50 rounded p-2">
            <div className="text-green-700 font-medium">平均密度</div>
            <div>{((communities.reduce((sum, c) => sum + c.density, 0) / communities.length) * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* 社群列表 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">社群详情</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {communities.slice(0, 5).map(community => (
            <div
              key={community.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: community.color }}
                />
                <span className="font-medium">社群 {community.id}</span>
              </div>
              <div className="text-gray-500">
                {community.size} 节点
              </div>
            </div>
          ))}
          {communities.length > 5 && (
            <div className="text-xs text-gray-500 text-center">
              还有 {communities.length - 5} 个社群...
            </div>
          )}
        </div>
      </div>

      {/* 社群间关系 */}
      {interCommunityRelations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">社群间连接</h4>
          <div className="space-y-1 text-xs">
            {interCommunityRelations.slice(0, 3).map((relation, index) => (
              <div key={index} className="flex justify-between items-center p-1">
                <span className="text-gray-600">
                  社群 {relation.sourceCommunity} ↔ 社群 {relation.targetCommunity}
                </span>
                <span className="text-gray-500">
                  {relation.edgeCount} 连接
                </span>
              </div>
            ))}
            {interCommunityRelations.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                还有 {interCommunityRelations.length - 3} 个关系...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};