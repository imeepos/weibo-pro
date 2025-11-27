import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, LucideIcon } from 'lucide-react';
import { Card } from '@sker/ui/components/ui/card';
import { Skeleton } from '@sker/ui/components/ui/skeleton';
import { Statistic, StatisticLabel, StatisticValue } from '@sker/ui/components/ui/statistic';
import { Trend } from '@sker/ui/components/ui/trend';
import { CountUp } from '@sker/ui/components/ui/count-up';
import { SentimentIndicator, SentimentLevel, SentimentType } from '@sker/ui/components/ui/sentiment-indicator';
import { cn } from '@/utils';

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'gray' | 'purple' | 'yellow';
  className?: string;
  loading?: boolean;
  chartComponent?: React.ReactNode;
  animated?: boolean;
  sentiment?: {
    type: SentimentType;
    level: SentimentLevel;
  };
}

const colorMap = {
  blue: {
    bg: 'bg-blue-500/20',
    icon: 'text-blue-400',
    gradient: 'from-blue-400 to-blue-600',
  },
  green: {
    bg: 'bg-green-500/20',
    icon: 'text-green-400',
    gradient: 'from-green-400 to-green-600',
  },
  red: {
    bg: 'bg-red-500/20',
    icon: 'text-red-400',
    gradient: 'from-red-400 to-red-600',
  },
  gray: {
    bg: 'bg-gray-500/20',
    icon: 'text-gray-400',
    gradient: 'from-gray-400 to-gray-600',
  },
  purple: {
    bg: 'bg-purple-500/20',
    icon: 'text-purple-400',
    gradient: 'from-purple-400 to-purple-600',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    icon: 'text-yellow-400',
    gradient: 'from-yellow-400 to-yellow-600',
  },
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon = BarChart3,
  color = 'blue',
  className,
  loading = false,
  chartComponent,
  animated = true,
  sentiment,
}) => {
  const colors = colorMap[color];

  if (loading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6 cursor-pointer', className)}>
      <div className="flex items-start justify-between">
        <Statistic className="flex-1">
          <StatisticLabel>{title}</StatisticLabel>
          <StatisticValue
            className={cn(
              'bg-gradient-to-r bg-clip-text text-transparent',
              colors.gradient
            )}
          >
            <CountUp end={value} animated={animated} />
          </StatisticValue>

          {change !== undefined && (
            <Trend value={change} label="vs 上期" />
          )}

          {sentiment && (
            <div className="mt-2">
              <SentimentIndicator
                type={sentiment.type}
                level={sentiment.level}
                showLabel
              />
            </div>
          )}
        </Statistic>

        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              colors.bg
            )}
          >
            <Icon className={cn('h-6 w-6', colors.icon)} />
          </div>

          {chartComponent && (
            <div className="h-10 w-16 overflow-hidden rounded-md bg-muted/30 p-1">
              {chartComponent}
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-1 rounded-b-lg bg-gradient-to-r',
          colors.gradient
        )}
      />
    </Card>
  );
};

export default React.memo(MetricCard);
