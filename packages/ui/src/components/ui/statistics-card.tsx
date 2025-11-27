import React from 'react';
import { cn } from '../../lib/utils';

export interface StatisticItem {
  label: string;
  value: number | string;
}

interface StatisticsCardProps {
  title?: string;
  items: StatisticItem[];
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4'
};

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  items,
  position = 'top-right',
  className
}) => {
  return (
    <div className={cn(
      "absolute bg-white rounded-lg shadow-md p-3 border border-gray-200",
      positionClasses[position],
      className
    )}>
      {title && (
        <div className="text-sm font-medium text-gray-700 mb-2">
          {title}
        </div>
      )}
      <div className="space-y-1 text-xs">
        {items.map((item, index) => (
          <div key={index}>
            {item.label}: {item.value}
          </div>
        ))}
      </div>
    </div>
  );
};
