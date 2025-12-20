import React from 'react';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';

interface UserDetectionHeaderProps {
  selectedTimeRange: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRiskLevel: string;
  onRiskLevelChange: (value: string) => void;
  riskLevels: string[];
  riskLevelLabels: Record<string, string>;
}

export const UserDetectionHeader = React.memo<UserDetectionHeaderProps>(({
  selectedTimeRange,
  searchTerm,
  onSearchChange,
  selectedRiskLevel,
  onRiskLevelChange,
  riskLevels,
  riskLevelLabels,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">用户检测面板</h1>
        <p className="text-muted-foreground mt-1">
          当前时间区间: {selectedTimeRange} | 用户行为监测与风险分析
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
  );
});

UserDetectionHeader.displayName = 'UserDetectionHeader';
