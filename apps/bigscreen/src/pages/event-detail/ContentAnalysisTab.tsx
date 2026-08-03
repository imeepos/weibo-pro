import React from 'react';
import { Clock, MessageCircle } from 'lucide-react';
import { TabsContent } from '@sker/ui/components/ui/tabs';
import PostingTimeHeatmap from '@/components/charts/PostingTimeHeatmap';
import { CommentThreadTree } from '@/components/charts/CommentThreadTree';
import type { LoadingState } from '@/types/tab-loading';
import { TabContentShell } from './TabContentShell';

interface ContentAnalysisTabProps {
  loadingState: LoadingState;
  postingTimeData: any;
  commentDepthData: any;
  onRetryTab: () => void;
}

export function ContentAnalysisTab({
  loadingState,
  postingTimeData,
  commentDepthData,
  onRetryTab,
}: ContentAnalysisTabProps) {
  return (
    <TabsContent value="content-analysis" className="mt-6">
      <TabContentShell loadingState={loadingState} loadingText="加载内容分析数据中..." onRetry={onRetryTab}>
        {/* P1: 发帖时间热力图 */}
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            发帖时间热力图
          </h3>
          <PostingTimeHeatmap
            data={postingTimeData}
            isLoading={!postingTimeData}
            height={400}
          />
        </div>

        {/* P1: 评论深度分析 */}
        <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            评论深度分析
          </h3>
          <CommentThreadTree
            data={commentDepthData}
            isLoading={!commentDepthData}
            height={400}
          />
        </div>
      </TabContentShell>
    </TabsContent>
  );
}
