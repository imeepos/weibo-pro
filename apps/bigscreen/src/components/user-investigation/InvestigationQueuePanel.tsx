import React from 'react';
import type { UserInvestigationQueueItem } from '@sker/sdk';

interface InvestigationQueuePanelProps {
  queue: UserInvestigationQueueItem[];
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
}

export function InvestigationQueuePanel({
  queue,
  selectedUserId,
  onSelectUser,
}: InvestigationQueuePanelProps) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">重点用户队列</h2>
        <p className="mt-1 text-sm text-muted-foreground">仅展示达到最低证据质量门槛的用户</p>
      </div>

      <div className="space-y-3">
        {queue.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            当前没有达到证据质量门槛的重点用户。
          </div>
        ) : (
          queue.map((item) => (
            <button
              key={item.weiboUserId}
              type="button"
              onClick={() => onSelectUser(item.weiboUserId)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selectedUserId === item.weiboUserId
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{item.screenName}</div>
                  <div className="text-xs text-muted-foreground">
                    风险分 {item.eventRiskScore} · 状态 {item.status}
                  </div>
                  {item.riskSignals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.riskSignals.map((signal) => (
                        <span
                          key={`${item.weiboUserId}-${signal}`}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.hasPersona ? '已入图谱' : '未入图谱'}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
