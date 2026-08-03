import React from 'react';
import { Globe } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import GeographicDistributionChart from '@/components/charts/GeographicDistributionChart';
import type { LoadingState } from '@/types/tab-loading';
import type { EventDetailData, GeographicDataPoint } from './types';
import type { TrendStats } from './utils';
import { TabContentShell } from './TabContentShell';

export interface GeographicStats {
  totalPosts?: number;
  totalUsers?: number;
  totalRegions?: number;
}

interface GeographicTabProps {
  loadingState: LoadingState;
  geographicData: GeographicDataPoint[];
  geographicStats: GeographicStats;
  stats: TrendStats | null;
  eventData: EventDetailData;
  onRetry: () => void;
}

export function GeographicTab({
  loadingState,
  geographicData,
  geographicStats,
  stats,
  eventData,
  onRetry,
}: GeographicTabProps) {
  return (
    <TabsContent value="geographic" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载地理分布数据中..." onRetry={onRetry}>
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            地理分布分析
          </h3>
          <GeographicDistributionChart
            data={geographicData}
            totalPosts={geographicStats.totalPosts ?? stats?.totalPosts ?? eventData.postCount}
            totalUsers={geographicStats.totalUsers}
            totalRegions={geographicStats.totalRegions}
            height={400}
            showTable={true}
            maxItems={20}
          />
        </div>
      </TabContentShell>
    </TabsContent>
  );
}
