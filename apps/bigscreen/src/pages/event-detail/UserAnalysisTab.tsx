import React from 'react';
import { AlertTriangle, Shield, Users } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import type { UserRelationNetwork } from '@sker/sdk';
import { AnalysisWidgetCard } from '@/components/ui';
import { UserRiskProfilePanel } from '@/components/charts/UserRiskProfilePanel';
import { AbnormalUserPanel } from '@/components/charts/AbnormalUserPanel';
import UserEngagementFunnel from '@/components/charts/UserEngagementFunnel';
import { UserRelationWordCloud } from '@/components/charts/UserRelationWordCloud';
import type { LoadingState } from '@/types/tab-loading';
import type { UserAnalysisWidgets } from './types';
import { TabContentShell } from './TabContentShell';

interface UserAnalysisTabProps {
  loadingState: LoadingState;
  userAnalysisWidgets: UserAnalysisWidgets;
  userStratificationData: any;
  userRelationNetwork: UserRelationNetwork | null;
  onRetryTab: () => void;
  onRetryWidgets: () => void;
}

export function UserAnalysisTab({
  loadingState,
  userAnalysisWidgets,
  userStratificationData,
  userRelationNetwork,
  onRetryTab,
  onRetryWidgets,
}: UserAnalysisTabProps) {
  return (
    <TabsContent value="user-analysis" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载用户分析数据中..." onRetry={onRetryTab}>
        <AnalysisWidgetCard
          title="用户风险画像"
          icon={<Shield className="h-4 w-4" />}
          state={userAnalysisWidgets.riskProfile}
          emptyText="暂无用户风险画像"
          onRetry={onRetryWidgets}
        >
          {userAnalysisWidgets.riskProfile.data ? (
            <UserRiskProfilePanel data={userAnalysisWidgets.riskProfile.data} />
          ) : null}
        </AnalysisWidgetCard>

        <AnalysisWidgetCard
          title="异常用户面板"
          icon={<AlertTriangle className="h-4 w-4" />}
          state={userAnalysisWidgets.abnormalUsers}
          emptyText="暂无异常用户"
          onRetry={onRetryWidgets}
        >
          <AbnormalUserPanel data={userAnalysisWidgets.abnormalUsers.data ?? []} />
        </AnalysisWidgetCard>

        {/* P1: 用户参与度分层 */}
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            用户参与度分层
          </h3>
          <UserEngagementFunnel
            data={userStratificationData}
            isLoading={!userStratificationData}
            height={400}
          />
        </div>

        {/* 用户关系词云 */}
        <UserRelationWordCloud
          network={userRelationNetwork}
          isLoading={!userRelationNetwork}
          height={400}
          maxWords={1000}
        />
      </TabContentShell>
    </TabsContent>
  );
}
