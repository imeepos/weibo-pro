import React from 'react';
import { Badge } from '@sker/ui/components/ui/badge';

interface EventInstitutionAccountData {
  userId: string;
  screenName: string;
  institutionType: 'government' | 'state_media' | 'enterprise_org' | 'official_other';
  postCount: number;
  interactionCount: number;
  influenceScore: number;
}

const institutionLabels = {
  government: '政府机构',
  state_media: '官方媒体',
  enterprise_org: '企业组织',
  official_other: '其他认证',
} as const;

export function InstitutionParticipationPanel({
  data,
}: {
  data: EventInstitutionAccountData[];
}) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.userId} className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{item.screenName}</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">{institutionLabels[item.institutionType]}</Badge>
                <span className="text-xs text-muted-foreground">
                  发帖 {item.postCount} · 互动 {item.interactionCount}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">{item.influenceScore}</div>
              <div className="text-xs text-muted-foreground">粉丝数</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
