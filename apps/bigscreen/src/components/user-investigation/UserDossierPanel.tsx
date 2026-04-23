import type { UserInvestigationDossier } from '@sker/sdk';

interface UserDossierPanelProps {
  dossier: UserInvestigationDossier | null;
}

export function UserDossierPanel({ dossier }: UserDossierPanelProps) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">用户 dossier</h2>
        <p className="mt-1 text-sm text-muted-foreground">主页历史发帖、关系样本与蒸馏前调查包</p>
      </div>

      {!dossier ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          选择一个高危候选后查看 dossier。
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border p-3">
            <div className="font-medium text-foreground">
              {dossier.accountSnapshot.displayName ?? dossier.accountSnapshot.screenName ?? '未知用户'}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {dossier.accountSnapshot.location ?? '未知地区'} · 粉丝 {dossier.accountSnapshot.followersCount}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">采样窗口</div>
              <div className="mt-1 font-medium text-foreground">
                {dossier.historyCoverage.windowDays} 天
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">历史帖子</div>
              <div className="mt-1 font-medium text-foreground">
                {dossier.historyCoverage.collectedPostCount}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">证据样本</div>
            <div className="mt-1 text-sm text-foreground">
              事件样本 {dossier.evidenceSamples.eventSamples.length} 条，历史样本 {dossier.evidenceSamples.historySamples.length} 条
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
