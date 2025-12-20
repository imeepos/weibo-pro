import React from 'react';
import { Clock } from 'lucide-react';

interface TimeRangeDisplayProps {
  timeRange: string;
  className?: string;
}

const TIME_RANGE_LABELS: Record<string, string> = {
  '1h': '最近1小时',
  '6h': '最近6小时',
  '12h': '最近12小时',
  '24h': '最近24小时',
  '7d': '最近7天',
  '30d': '最近30天',
  '90d': '最近90天',
  '180d': '最近180天',
  '365d': '最近365天',
};

const TimeRangeDisplay: React.FC<TimeRangeDisplayProps> = ({ timeRange, className = '' }) => {
  const label = TIME_RANGE_LABELS[timeRange] || timeRange;

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <Clock className="size-4" />
      <span>{label}</span>
    </div>
  );
};

export default TimeRangeDisplay;
