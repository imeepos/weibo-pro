import React, { useState } from 'react';
import type { CommunityStats, TopUser, LocationStats } from '@/hooks/useGraphStatistics';
import { ChevronRight, ChevronLeft, Users, MapPin, Network } from 'lucide-react';

type TabType = 'community' | 'user' | 'location';

interface GraphStatisticsPanelProps {
  communityStats: CommunityStats[];
  topUsers: TopUser[];
  locationStats: LocationStats[];
  onUserClick?: (user: TopUser) => void;
  onCommunityClick?: (community: CommunityStats) => void;
  className?: string;
}

export const GraphStatisticsPanel: React.FC<GraphStatisticsPanelProps> = ({
  communityStats,
  topUsers,
  locationStats,
  onUserClick,
  onCommunityClick,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('community');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'community', label: '群组', icon: <Network className="w-3.5 h-3.5" /> },
    { key: 'user', label: '用户', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'location', label: '区域', icon: <MapPin className="w-3.5 h-3.5" /> },
  ];

  const renderCommunityContent = () => {
    if (communityStats.length === 0) {
      return <div className="text-center text-muted-foreground py-4 text-xs">暂无群组数据</div>;
    }

    return (
      <div className="space-y-1.5">
        {communityStats.map((stat, index) => (
          <div
            key={stat.communityId}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onCommunityClick?.(stat)}
          >
            <div
              data-testid="community-color"
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: stat.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">群组 #{index + 1}</div>
            </div>
            <div className="text-xs text-muted-foreground flex-shrink-0">{stat.nodeCount} 人</div>
          </div>
        ))}
      </div>
    );
  };

  const renderUserContent = () => {
    if (topUsers.length === 0) {
      return <div className="text-center text-muted-foreground py-4 text-xs">暂无用户数据</div>;
    }

    return (
      <div className="space-y-1.5">
        {topUsers.map((user, index) => (
          <div
            key={user.id}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onUserClick?.(user)}
          >
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary">#{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium truncate">{user.name}</span>
                {user.verified && (
                  <span
                    data-testid="verified-badge"
                    className="text-[10px] text-blue-500"
                    title="已认证"
                  >
                    ✓
                  </span>
                )}
              </div>
              {user.location && (
                <div className="text-[10px] text-muted-foreground truncate">{user.location}</div>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex-shrink-0">{user.degree} 连线</div>
          </div>
        ))}
      </div>
    );
  };

  const renderLocationContent = () => {
    if (locationStats.length === 0) {
      return <div className="text-center text-muted-foreground py-4 text-xs">暂无区域数据</div>;
    }

    return (
      <div className="space-y-2">
        {locationStats.map((stat) => (
          <div key={stat.location} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate">{stat.location}</span>
              <span className="text-muted-foreground flex-shrink-0 ml-2">
                {stat.count} 人 · {stat.percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                data-testid="location-progress"
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${stat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'community':
        return renderCommunityContent();
      case 'user':
        return renderUserContent();
      case 'location':
        return renderLocationContent();
      default:
        return null;
    }
  };

  return (
    <div
      className={`absolute top-4 right-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg transition-all duration-300 ${className}`}
      style={{ width: isCollapsed ? '40px' : '240px' }}
    >
      {/* 折叠按钮 */}
      <button
        data-testid="collapse-button"
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {!isCollapsed && (
        <>
          {/* 标题 */}
          <div className="px-3 py-2 border-b border-border">
            <h3 className="text-sm font-semibold">统计信息</h3>
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs transition-colors ${
                  activeTab === tab.key
                    ? 'text-primary border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
            {renderContent()}
          </div>
        </>
      )}
    </div>
  );
};

export default GraphStatisticsPanel;
