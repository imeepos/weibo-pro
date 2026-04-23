import type { EventSentimentTrendDetailedPoint } from '@sker/sdk';
import type { TimeSeriesData } from '@/types';
import TimeSeriesChart from './TimeSeriesChart';

function toTimeSeriesData(
  data: EventSentimentTrendDetailedPoint[],
): TimeSeriesData[] {
  return data.map((item) => ({
    timestamp: item.timestamp,
    value: Math.round(item.negative * 100),
    positive: Math.round(item.positive * 100),
    negative: Math.round(item.negative * 100),
    neutral: Math.round(item.neutral * 100),
  }));
}

export function DetailedSentimentTrendPanel({
  data,
}: {
  data: EventSentimentTrendDetailedPoint[];
}) {
  return <TimeSeriesChart data={toTimeSeriesData(data)} title="" height={320} />;
}
