import React from 'react';
import { Button } from '@sker/ui/components/ui/button';
import { Input } from '@sker/ui/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';
import { RefreshCwIcon } from 'lucide-react';
import type { LogFilters } from '@/hooks/useLlmLogs';
import type { TimeRange } from '@sker/entities';
import { TIME_RANGE_LABELS } from './constants';

interface FilterBarProps {
  filters: LogFilters;
  onFiltersChange: (filters: LogFilters) => void;
  timeRange: TimeRange;
  refreshing: boolean;
  onRefresh: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  timeRange,
  refreshing,
  onRefresh,
}) => {
  const updateFilters = (patch: Partial<LogFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-sm text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg">
        时间范围: <span className="font-medium text-foreground">{TIME_RANGE_LABELS[timeRange]}</span>
      </div>
      <div className="w-px h-6 bg-border" />
      <Input
        type="text"
        value={filters.modelName}
        onChange={(e) => updateFilters({ modelName: e.target.value })}
        placeholder="模型名称"
        className="w-[150px]"
      />
      <Input
        type="text"
        value={filters.providerId}
        onChange={(e) => updateFilters({ providerId: e.target.value })}
        placeholder="Provider ID"
        className="w-[150px]"
      />
      <Select
        value={filters.isSuccess === undefined ? 'all' : filters.isSuccess.toString()}
        onValueChange={(value) =>
          updateFilters({
            isSuccess: value === 'all' ? undefined : value === 'true',
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="true">成功</SelectItem>
          <SelectItem value="false">失败</SelectItem>
        </SelectContent>
      </Select>
      <div className="w-px h-6 bg-border" />
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="gap-2">
        <RefreshCwIcon className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
        刷新
      </Button>
    </div>
  );
};

export default FilterBar;
