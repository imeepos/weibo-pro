import type { CommunityAnalysis } from '@sker/sdk';

interface CommunityStatsOverlayProps {
  data: CommunityAnalysis;
}

export function CommunityStatsOverlay({ data }: CommunityStatsOverlayProps) {
  return (
    <div className="absolute top-16 left-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
      <div className="text-xs text-gray-400 mb-3 font-bold">社区统计</div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-400">社区数:</span>
          <span className="text-white font-bold">{data.totalCommunities}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-gray-400">模块度:</span>
          <span className="text-blue-400 font-bold">{data.modularity.toFixed(2)}</span>
        </div>
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400">桥接用户:</span>
            <span className="text-amber-400 font-bold">{data.bridgeUsers.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BridgeUsersOverlayProps {
  data: CommunityAnalysis;
}

export function BridgeUsersOverlay({ data }: BridgeUsersOverlayProps) {
  if (data.bridgeUsers.length === 0) return null;

  return (
    <div className="absolute top-16 right-4 z-10 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700 w-64">
      <div className="text-xs text-gray-400 mb-3 font-bold">桥接用户</div>
      <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
        {data.bridgeUsers.map((bridgeUser) => (
          <div
            key={bridgeUser.userId}
            className="flex items-center justify-between gap-2 p-2 rounded bg-amber-900/20 hover:bg-amber-900/30 transition-colors cursor-pointer border border-amber-700/30"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-amber-400">🌉</span>
              <span className="text-gray-300 truncate">{bridgeUser.screenName}</span>
            </div>
            <span className="text-amber-400 font-bold flex-shrink-0">
              {(bridgeUser.bridgeScore * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
