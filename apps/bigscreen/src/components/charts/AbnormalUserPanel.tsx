import { Badge } from '@sker/ui/components/ui/badge';
import type { EventAbnormalUser } from '@sker/sdk';

const ACCOUNT_TYPE_LABEL: Record<EventAbnormalUser['accountType'], string> = {
  bot: 'bot',
  troll: 'troll',
  zombie: 'zombie',
  suspicious: 'suspicious',
  normal: 'normal',
};

export function AbnormalUserPanel({ data }: { data: EventAbnormalUser[] }) {
  if (!data.length) {
    return <div className="py-10 text-center text-sm text-muted-foreground">暂无异常用户</div>;
  }

  return (
    <div className="space-y-3">
      {data.map((user) => (
        <div key={user.userId} className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{user.screenName}</div>
              <p className="mt-1 text-xs text-muted-foreground">{user.summary}</p>
              <div className="mt-2 text-xs text-muted-foreground">
                风险分 {user.riskScore} · 粉丝 {user.followers} · 发帖 {user.postCount}
              </div>
            </div>
            <Badge variant="secondary">{ACCOUNT_TYPE_LABEL[user.accountType]}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.abnormalSignals.map((signal) => (
              <span
                key={`${user.userId}-${signal.type}`}
                className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive"
              >
                {signal.type}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
