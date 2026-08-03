import React from 'react';
import { Users } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import type { UserRelationNetwork } from '@sker/sdk';
import UserRelationGraph3DOffscreen from '@/components/charts/UserRelationGraph3DOffscreen';
import type { LoadingState } from '@/types/tab-loading';
import { TabContentShell } from './TabContentShell';

interface NetworkTabProps {
  loadingState: LoadingState;
  userRelationNetwork: UserRelationNetwork | null;
  onRetry: () => void;
}

export function NetworkTab({ loadingState, userRelationNetwork, onRetry }: NetworkTabProps) {
  return (
    <TabsContent value="network" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载关系网络数据中..." onRetry={onRetry}>
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            用户关系网络
          </h3>
          {userRelationNetwork && userRelationNetwork.nodes.length > 0 ? (
            <div className="h-[550px]">
              <UserRelationGraph3DOffscreen network={userRelationNetwork} className="w-full h-full" edgeThreshold={10} />
            </div>
          ) : (
            <div className="h-[550px] flex items-center justify-center text-muted-foreground">
              暂无用户关系数据
            </div>
          )}
        </div>
      </TabContentShell>
    </TabsContent>
  );
}
