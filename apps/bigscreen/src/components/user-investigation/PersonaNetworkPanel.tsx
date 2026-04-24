import { Button } from '@sker/ui/components/ui/button';
import { usePersonaNetworkGraph } from '@/hooks/usePersonaNetworkGraph';

interface PersonaNetworkPanelProps {
  onBackToInvestigation: () => void;
}

export function PersonaNetworkPanel({ onBackToInvestigation }: PersonaNetworkPanelProps) {
  const { graph, isLoading, error } = usePersonaNetworkGraph();

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">全量 Persona 图谱</h2>
          <p className="mt-1 text-sm text-muted-foreground">已蒸馏用户之间的互动、共事件与画像相似关系</p>
        </div>
        <Button variant="outline" onClick={onBackToInvestigation}>
          返回调查模式
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          加载 Persona 图谱...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-destructive">
          Persona 图谱加载失败
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 text-sm text-foreground">
            Persona 节点 {graph.personas.length} 个，关系边 {graph.edges.length} 条
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {graph.personas.slice(0, 6).map((persona) => (
              <div key={persona.personaId} className="rounded-lg border p-3">
                <div className="font-medium text-foreground">{persona.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  风险 {persona.riskLevel} · 分数 {persona.riskScore} · 记忆 {persona.memoryCount}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium text-foreground">关系边摘要</div>
            {graph.edges.length > 0 ? (
              <div className="mt-3 space-y-2">
                {graph.edges.slice(0, 6).map((edge) => {
                  const source = graph.personas.find((item) => item.personaId === edge.sourcePersonaId);
                  const target = graph.personas.find((item) => item.personaId === edge.targetPersonaId);

                  return (
                    <div key={edge.id} className="rounded-md bg-muted/40 p-3 text-sm">
                      <div className="font-medium text-foreground">
                        {source?.name ?? edge.sourcePersonaId} → {target?.name ?? edge.targetPersonaId}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {edge.edgeType} · 权重 {edge.weight}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{edge.reason}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">当前没有可展示的 Persona 关系边。</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
