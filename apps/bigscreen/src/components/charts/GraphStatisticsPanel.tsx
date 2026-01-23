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

    const totalNodes = communityStats.reduce((sum, stat) => sum + stat.nodeCount, 0);

    return (
      <div className="space-y-1">
        {communityStats.map((stat, index) => {
          const percentage = totalNodes > 0 ? (stat.nodeCount / totalNodes) * 100 : 0;
          return (
            <div
              key={stat.communityId}
              className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-all duration-200"
              onClick={() => onCommunityClick?.(stat)}
            >
              <div
                data-testid="community-color"
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background"
                style={{ backgroundColor: stat.color, boxShadow: `0 0 8px ${stat.color}40` }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">群组 #{index + 1}</span>
                  <span className="text-xs font-semibold tabular-nums">{stat.nodeCount.toLocaleString()} 人</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: stat.color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderUserContent = () => {
    if (topUsers.length === 0) {
      return <div className="text-center text-muted-foreground py-4 text-xs">暂无用户数据</div>;
    }

    const maxDegree = Math.max(...topUsers.map(u => u.degree));

    return (
      <div className="space-y-1">
        {topUsers.map((user, index) => {
          const barWidth = maxDegree > 0 ? (user.degree / maxDegree) * 100 : 0;
          const rankColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
          const rankColor = index < 3 ? rankColors[index] : 'text-muted-foreground';

          return (
            <div
              key={user.id}
              className="group relative p-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-all duration-200"
              onClick={() => onUserClick?.(user)}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${index < 3 ? 'bg-primary/10' : 'bg-muted'}`}>
                  <span className={`text-[10px] font-bold ${rankColor}`}>
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium truncate">{user.name || '未知用户'}</span>
                    {user.verified && (
                      <span
                        data-testid="verified-badge"
                        className="text-[10px] text-blue-500 flex-shrink-0"
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
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold tabular-nums">{user.degree.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">连线</div>
                </div>
              </div>
              <div className="mt-1.5 h-0.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLocationContent = () => {
    if (locationStats.length === 0) {
      return <div className="text-center text-muted-foreground py-4 text-xs">暂无区域数据</div>;
    }

    return (
      <div className="space-y-1.5">
        {locationStats.map((stat, index) => {
          const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500'];
          const barColor = colors[index % colors.length];

          return (
            <div key={stat.location} className="p-2 rounded-lg hover:bg-muted/40 transition-all duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium truncate">{stat.location || '未知地区'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold tabular-nums">{stat.count.toLocaleString()}</span>
                  <span className="text-muted-foreground">人</span>
                  <span className="text-muted-foreground px-1.5 py-0.5 bg-muted rounded text-[10px] tabular-nums">
                    {stat.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  data-testid="location-progress"
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${stat.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
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
