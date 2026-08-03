import React from 'react';
import { Database, Search, ShieldCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';

interface UserDetectionHeaderProps {
  selectedTimeRange: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRiskLevel: string;
  onRiskLevelChange: (value: string) => void;
  riskLevels: string[];
  riskLevelLabels: Record<string, string>;
  qualitySummary: {
    validCount: number;
    filteredCount: number;
    coverageRate: number;
  } | null;
}

export const UserDetectionHeader = React.memo<UserDetectionHeaderProps>(({
  selectedTimeRange,
  searchTerm,
  onSearchChange,
  selectedRiskLevel,
  onRiskLevelChange,
  riskLevels,
  riskLevelLabels,
  qualitySummary,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">用户检测面板</h1>
        <p className="text-muted-foreground mt-1">
          {selectedTimeRange} · 基于可验证行为证据的用户风险分析
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <label htmlFor="user-search" className="sr-only">
            搜索用户名或昵称
          </label>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="user-search"
            type="text"
            placeholder="搜索用户名或昵称..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="搜索用户名或昵称"
            className="pl-10 pr-4 py-2 bg-muted rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        <Select value={selectedRiskLevel} onValueChange={onRiskLevelChange}>
          <SelectTrigger className="min-w-[150px]" aria-label="选择风险等级">
            <SelectValue placeholder="选择风险等级" />
          </SelectTrigger>
          <SelectContent>
            {(riskLevels.length ? riskLevels : ['all']).map(level => (
              <SelectItem key={level} value={level}>
                {riskLevelLabels[level] ?? (level === 'all' ? '全部等级' : level)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      </div>

      {qualitySummary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-xs text-muted-foreground">有效用户</div>
              <div className="text-lg font-semibold text-foreground">{qualitySummary.validCount.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <Database className="h-5 w-5 text-amber-600" />
            <div>
              <div className="text-xs text-muted-foreground">已过滤低质量数据</div>
              <div className="text-lg font-semibold text-foreground">{qualitySummary.filteredCount.toLocaleString()}</div>
            </div>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>数据覆盖率</span>
              <span>{qualitySummary.coverageRate.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, qualitySummary.coverageRate))}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

UserDetectionHeader.displayName = 'UserDetectionHeader';
