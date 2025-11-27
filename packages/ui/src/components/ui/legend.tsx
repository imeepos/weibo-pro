import React from 'react';
import { cn } from '../../lib/utils';

export interface LegendItem {
  color: string;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  borderColor?: string;
}

interface LegendProps {
  title?: string;
  items: LegendItem[];
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4'
};

export const Legend: React.FC<LegendProps> = ({
  title,
  items,
  position = 'bottom-left',
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
      <div className="space-y-2 text-xs">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className={cn("rounded-full", sizeClasses[item.size || 'md'])}
              style={{
                background: item.color,
                border: item.borderColor ? `2px solid ${item.borderColor}` : undefined
              }}
            />
            <span className="text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
