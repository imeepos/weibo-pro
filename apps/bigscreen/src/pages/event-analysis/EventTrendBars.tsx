import React from 'react';

export interface EventTrendBarsProps {
  data?: number[];
}

/** 迷你趋势柱状图（取最近 7 个点） */
export const EventTrendBars: React.FC<EventTrendBarsProps> = ({ data = [] }) => {
  if (data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5 h-8 w-14">
      {data.slice(-7).map((value, index) => {
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={index}
            className="flex-1 bg-gradient-to-t from-primary/70 to-primary rounded-sm transition-all duration-300"
            style={{ height: `${Math.max(height, 8)}%` }}
          />
        );
      })}
    </div>
  );
};
