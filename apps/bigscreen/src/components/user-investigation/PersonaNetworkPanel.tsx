import { Button } from '@sker/ui/components/ui/button';
import { usePersonaNetworkGraph } from '@/hooks/usePersonaNetworkGraph';
import { useMemo, useState } from 'react';

interface PersonaNetworkPanelProps {
  onBackToInvestigation: () => void;
  onSelectPersona?: (weiboUserId: string) => void;
}

export function PersonaNetworkPanel({ onBackToInvestigation, onSelectPersona }: PersonaNetworkPanelProps) {
  const { graph, isLoading, error } = usePersonaNetworkGraph();
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<'all' | 'interaction' | 'co_event' | 'profile_similarity'>('all');

  const filteredPersonas = useMemo(() => {
    if (riskFilter === 'all') return graph.personas;
    return graph.personas.filter((persona) => persona.riskLevel === riskFilter);
  }, [graph.personas, riskFilter]);

  const visiblePersonaIds = useMemo(
    () => new Set(filteredPersonas.map((persona) => persona.personaId)),
    [filteredPersonas],
  );

  const filteredEdges = useMemo(() => {
    return graph.edges.filter((edge) => {
      const passesType = edgeTypeFilter === 'all' || edge.edgeType === edgeTypeFilter;
      const passesNodes =
        visiblePersonaIds.has(edge.sourcePersonaId) &&
        visiblePersonaIds.has(edge.targetPersonaId);
      return passesType && passesNodes;
    });
  }, [edgeTypeFilter, graph.edges, visiblePersonaIds]);

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
          <div className="flex flex-wrap gap-2 rounded-lg border p-3">
            <Button variant={riskFilter === 'all' ? 'default' : 'outline'} onClick={() => setRiskFilter('all')}>
              全部风险
            </Button>
            <Button variant={riskFilter === 'high' ? 'default' : 'outline'} onClick={() => setRiskFilter('high')}>
              仅高风险
            </Button>
            <Button variant={riskFilter === 'medium' ? 'default' : 'outline'} onClick={() => setRiskFilter('medium')}>
              仅中风险
            </Button>
            <Button variant={edgeTypeFilter === 'all' ? 'default' : 'outline'} onClick={() => setEdgeTypeFilter('all')}>
              全部边
            </Button>
            <Button variant={edgeTypeFilter === 'interaction' ? 'default' : 'outline'} onClick={() => setEdgeTypeFilter('interaction')}>
              仅互动边
            </Button>
            <Button variant={edgeTypeFilter === 'co_event' ? 'default' : 'outline'} onClick={() => setEdgeTypeFilter('co_event')}>
              仅共事件边
            </Button>
            <Button variant={edgeTypeFilter === 'profile_similarity' ? 'default' : 'outline'} onClick={() => setEdgeTypeFilter('profile_similarity')}>
              仅相似边
            </Button>
          </div>
          <div className="rounded-lg border p-4 text-sm text-foreground">
            Persona 节点 {filteredPersonas.length} 个，关系边 {filteredEdges.length} 条
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredPersonas.slice(0, 6).map((persona) => (
              <button
                key={persona.personaId}
                type="button"
                onClick={() => onSelectPersona?.(persona.weiboUserId)}
                className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/30"
              >
                <div className="font-medium text-foreground">{persona.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  风险 {persona.riskLevel} · 分数 {persona.riskScore} · 记忆 {persona.memoryCount}
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium text-foreground">关系边摘要</div>
            {filteredEdges.length > 0 ? (
              <div className="mt-3 space-y-2">
                {filteredEdges.slice(0, 6).map((edge) => {
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
