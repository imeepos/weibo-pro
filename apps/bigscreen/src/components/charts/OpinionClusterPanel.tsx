import React from 'react';
import { Badge } from '@sker/ui/components/ui/badge';
import type { EventOpinionCluster } from '@sker/sdk';

const STANCE_LABEL: Record<EventOpinionCluster['stance'], string> = {
  supportive: '支持',
  critical: '批评',
  neutral: '中性',
};

export function OpinionClusterPanel({ data }: { data: EventOpinionCluster[] }) {
  if (!data.length) {
    return <div className="py-10 text-center text-sm text-muted-foreground">暂无观点簇数据</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((cluster) => (
        <div key={cluster.id} className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{cluster.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{cluster.summary}</p>
            </div>
            <Badge variant="secondary">{STANCE_LABEL[cluster.stance]}</Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{cluster.postCount} 条帖子</span>
            <span>{cluster.userCount} 位用户</span>
          </div>

          {cluster.keywords.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {cluster.keywords.map((keyword) => (
                <span
                  key={`${cluster.id}-${keyword}`}
                  className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}

          {cluster.representativePosts.length > 0 ? (
            <div className="mt-4 space-y-2">
              {cluster.representativePosts.map((post) => (
                <div key={post.postId} className="rounded-lg border border-border/40 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-foreground">{post.author}</div>
                    <div className="text-xs text-muted-foreground">互动 {post.engagement}</div>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{post.excerpt}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
