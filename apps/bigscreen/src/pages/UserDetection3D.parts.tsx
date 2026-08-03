import React from 'react';
import {
  Users,
  Search,
  AlertTriangle,
  Shield,
  Eye,
  Rotate3D,
  Filter,
  Network,
} from 'lucide-react';
import { MetricCard } from '@sker/ui/components/ui/metric-card';
import MiniTrendChart from '@/components/charts/MiniTrendChart';
import { Popover, PopoverTrigger, PopoverContent } from '@sker/ui/components/ui/popover';
import { Button } from '@sker/ui/components/ui/button';
import { Input } from '@sker/ui/components/ui/input';
import { Badge } from '@sker/ui/components/ui/badge';
import type { UserStatistics } from '@sker/sdk';
import { RISK_COLORS, RISK_LEVELS, riskLabel } from './UserDetection3D.utils';

interface PageHeaderProps {
  userCount: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRiskLevel: string;
  onRiskLevelChange: (level: string) => void;
  viewMode: '2d' | '3d';
  onViewModeChange: (mode: '2d' | '3d') => void;
}

export function PageHeader({
  userCount,
  searchTerm,
  onSearchChange,
  selectedRiskLevel,
  onRiskLevelChange,
  viewMode,
  onViewModeChange,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Network className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold text-white">用户关系网络</h1>
        </div>
        <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">
          {userCount} 用户
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 w-64 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
          />
        </div>

        {/* 风险筛选 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              {selectedRiskLevel === 'all' ? '全部风险' : `${selectedRiskLevel} 风险`}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48">
            <div className="space-y-1">
              <Button
                variant={selectedRiskLevel === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => onRiskLevelChange('all')}
              >
                全部风险
              </Button>
              {RISK_LEVELS.map(level => (
                <Button
                  key={level}
                  variant={selectedRiskLevel === level ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onRiskLevelChange(level)}
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: RISK_COLORS[level] }}
                  />
                  {riskLabel(level)}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 视图切换 */}
        <div className="flex bg-white/5 rounded-lg p-1">
          <Button
            variant={viewMode === '3d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('3d')}
            className="gap-2"
          >
            <Rotate3D className="w-4 h-4" />
            3D
          </Button>
          <Button
            variant={viewMode === '2d' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('2d')}
          >
            2D
          </Button>
        </div>
      </div>
    </div>
  );
}

interface UsersByRisk {
  high: number;
  medium: number;
  low: number;
}

interface StatsPanelProps {
  totalUsers: number;
  usersByRisk: UsersByRisk;
  statistics: UserStatistics | null;
}

export function StatsPanel({ totalUsers, usersByRisk, statistics }: StatsPanelProps) {
  return (
    <div className="w-80 p-4 space-y-4 overflow-y-auto border-r border-white/10">
      <MetricCard
        title="总用户数"
        value={totalUsers}
        change={statistics?.changes.total}
        icon={Users}
        color="blue"
        chartComponent={<MiniTrendChart data={statistics?.trendData.total || []} color="#3b82f6" type="line" />}
      />
      <MetricCard
        title="高风险用户"
        value={usersByRisk.high}
        change={statistics?.changes.highRisk}
        icon={AlertTriangle}
        color="red"
        chartComponent={<MiniTrendChart data={statistics?.trendData.highRisk || []} color="#ef4444" type="bar" />}
      />
      <MetricCard
        title="中风险用户"
        value={usersByRisk.medium}
        change={statistics?.changes.mediumRisk}
        icon={Eye}
        color="yellow"
        chartComponent={<MiniTrendChart data={statistics?.trendData.mediumRisk || []} color="#eab308" type="line" />}
      />
      <MetricCard
        title="低风险用户"
        value={usersByRisk.low}
        change={statistics?.changes.lowRisk}
        icon={Shield}
        color="green"
        chartComponent={<MiniTrendChart data={statistics?.trendData.lowRisk || []} color="#10b981" type="bar" />}
      />

      {/* 图例 */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-sm font-medium text-white mb-3">风险等级</h3>
        <div className="space-y-2">
          {RISK_LEVELS.map(level => (
            <div key={level} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: RISK_COLORS[level] }}
              />
              <span className="text-sm text-muted-foreground">{riskLabel(level)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
