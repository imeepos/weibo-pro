import React from 'react';
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
            <div className="mt-2 text-xs text-muted-foreground">
              认证 {dossier.accountSnapshot.verified ? '是' : '否'} · 平台风险 {dossier.accountSnapshot.urisk ?? '未知'}
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
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">事件风险分</div>
              <div className="mt-1 font-medium text-foreground">
                {dossier.eventRiskContext.eventRiskScore}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">事件内互动</div>
              <div className="mt-1 font-medium text-foreground">
                {dossier.eventRiskContext.eventInteractionCount}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">证据样本覆盖</div>
            <div className="mt-1 text-sm text-foreground">
              事件样本 {dossier.evidenceSamples.eventSamples.length} 条，历史样本 {dossier.evidenceSamples.historySamples.length} 条
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">关键词摘要</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {dossier.topicAndSentimentProfile.primaryKeywords.length > 0 ? (
                dossier.topicAndSentimentProfile.primaryKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                  >
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">暂无关键词摘要</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">行为时间线</div>
            {dossier.behaviorTimeline.activePeriods.length > 0 ? (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {dossier.behaviorTimeline.activePeriods.map((period) => (
                    <span
                      key={period}
                      className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                    >
                      {period}
                    </span>
                  ))}
                </div>
                {dossier.behaviorTimeline.spikeMoments.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {dossier.behaviorTimeline.spikeMoments[0]?.reason}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">暂无行为时间线摘要</div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">情绪分布</div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <span className="text-foreground">正向 {dossier.topicAndSentimentProfile.sentimentDistribution.positive}</span>
              <span className="text-foreground">负向 {dossier.topicAndSentimentProfile.sentimentDistribution.negative}</span>
              <span className="text-foreground">中性 {dossier.topicAndSentimentProfile.sentimentDistribution.neutral}</span>
            </div>
            {dossier.topicAndSentimentProfile.topicClusters.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                主题簇：{dossier.topicAndSentimentProfile.topicClusters.map((cluster) => cluster.label).join('、')}
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">关系摘要</div>
            {dossier.relationSummary.topConnectedUsers.length > 0 ? (
              <div className="mt-2 space-y-2">
                {dossier.relationSummary.topConnectedUsers.slice(0, 3).map((item) => (
                  <div key={item.userId} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{item.userId}</span>
                    <span className="text-muted-foreground">权重 {item.weight}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">暂无高频互动关系</div>
            )}
            {dossier.relationSummary.suspiciousCoordinationHints.length > 0 && (
              <div className="mt-3 space-y-1">
                {dossier.relationSummary.suspiciousCoordinationHints.map((hint) => (
                  <div key={hint} className="text-sm text-amber-600">
                    {hint}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">预蒸馏告警</div>
            {dossier.preDistillationSummary.coverageWarnings.length > 0 ? (
              <div className="mt-2 space-y-1">
                {dossier.preDistillationSummary.coverageWarnings.map((warning) => (
                  <div key={warning} className="text-sm text-destructive">
                    {warning}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">暂无告警</div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">证据样本</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-md bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">事件内样本</div>
                <div className="mt-2 space-y-2">
                  {dossier.evidenceSamples.eventSamples.length > 0 ? (
                    dossier.evidenceSamples.eventSamples.slice(0, 2).map((item) => (
                      <div key={item.sourceId} className="text-sm text-foreground">
                        {item.excerpt}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">暂无</div>
                  )}
                </div>
              </div>

              <div className="rounded-md bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">历史样本</div>
                <div className="mt-2 space-y-2">
                  {dossier.evidenceSamples.historySamples.length > 0 ? (
                    dossier.evidenceSamples.historySamples.slice(0, 2).map((item) => (
                      <div key={item.sourceId} className="text-sm text-foreground">
                        {item.excerpt}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">暂无</div>
                  )}
                </div>
              </div>

              <div className="rounded-md bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">关系样本</div>
                <div className="mt-2 space-y-2">
                  {dossier.evidenceSamples.relationSamples.length > 0 ? (
                    dossier.evidenceSamples.relationSamples.slice(0, 2).map((item) => (
                      <div key={item.sourceId} className="text-sm text-foreground">
                        {item.excerpt}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">暂无</div>
                  )}
                </div>
              </div>

              <div className="rounded-md bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">NLP 样本</div>
                <div className="mt-2 space-y-2">
                  {dossier.evidenceSamples.nlpSamples.length > 0 ? (
                    dossier.evidenceSamples.nlpSamples.slice(0, 2).map((item) => (
                      <div key={item.sourceId} className="text-sm text-foreground">
                        {item.excerpt}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">暂无</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
