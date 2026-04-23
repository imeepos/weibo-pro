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
        <div className="rounded-lg border p-4 text-sm text-foreground">
          Persona 节点 {graph.personas.length} 个，关系边 {graph.edges.length} 条
        </div>
      )}
    </section>
  );
}
