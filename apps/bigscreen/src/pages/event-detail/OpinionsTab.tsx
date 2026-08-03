import React from 'react';
import { MessageSquare } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import { AnalysisWidgetCard } from '@/components/ui';
import { OpinionClusterPanel } from '@/components/charts/OpinionClusterPanel';
import type { LoadingState } from '@/types/tab-loading';
import type { OpinionWidgets } from './types';
import { TabContentShell } from './TabContentShell';

interface OpinionsTabProps {
  loadingState: LoadingState;
  opinionWidgets: OpinionWidgets;
  onRetryTab: () => void;
  onRetryWidgets: () => void;
}

export function OpinionsTab({
  loadingState,
  opinionWidgets,
  onRetryTab,
  onRetryWidgets,
}: OpinionsTabProps) {
  return (
    <TabsContent value="opinions" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载观点汇集数据中..." onRetry={onRetryTab}>
        <AnalysisWidgetCard
          title="观点簇概览"
          icon={<MessageSquare className="h-4 w-4" />}
          state={opinionWidgets.clusters}
          emptyText="暂无观点簇数据"
          onRetry={onRetryWidgets}
        >
          <OpinionClusterPanel data={opinionWidgets.clusters.data ?? []} />
        </AnalysisWidgetCard>
      </TabContentShell>
    </TabsContent>
  );
}
