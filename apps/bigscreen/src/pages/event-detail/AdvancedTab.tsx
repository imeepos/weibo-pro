import React from 'react';
import { Clock, TrendingUp, Zap } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import { PropagationVelocityChart } from '@/components/charts/PropagationVelocityChart';
import InfluencePredictionCard from '@/components/charts/InfluencePredictionCard';
import { CommunityEvolutionTimeline } from '@/components/charts/CommunityEvolutionTimeline';
import type { LoadingState } from '@/types/tab-loading';
import { TabContentShell } from './TabContentShell';

interface AdvancedTabProps {
  loadingState: LoadingState;
  propagationVelocityData: any;
  influencePredictionData: any;
  communityEvolutionData: any;
  onRetryTab: () => void;
}

export function AdvancedTab({
  loadingState,
  propagationVelocityData,
  influencePredictionData,
  communityEvolutionData,
  onRetryTab,
}: AdvancedTabProps) {
  return (
    <TabsContent value="advanced" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载高级分析数据中..." onRetry={onRetryTab}>
        {/* P3: 传播速度分析 */}
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            传播速度分析
          </h3>
          <PropagationVelocityChart
            data={propagationVelocityData}
            isLoading={!propagationVelocityData}
            height={400}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* P3: 影响力预测 */}
          <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              影响力预测
            </h3>
            <InfluencePredictionCard
              data={influencePredictionData}
              isLoading={!influencePredictionData}
            />
          </div>

          {/* P3: 社区演化追踪 */}
          <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              社区演化追踪
            </h3>
            <CommunityEvolutionTimeline
              data={communityEvolutionData}
              isLoading={!communityEvolutionData}
            />
          </div>
        </div>
      </TabContentShell>
    </TabsContent>
  );
}
