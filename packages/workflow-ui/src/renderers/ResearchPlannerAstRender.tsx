import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { ResearchPlannerAst } from '@sker/workflow-ast';

const SubproblemItem: React.FC<{ problem: string; index: number; total: number }> = ({ problem, index, total }) => {
  const colors = [
    'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'bg-sky-500/20 text-sky-400 border-sky-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ];
  const color = colors[index % colors.length];

  return (
    <div className={`p-3 rounded-lg border ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-medium text-muted-foreground">
          研究员 #{index + 1} / {total}
        </span>
      </div>
      <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
        {problem}
      </div>
    </div>
  );
};

const ResearchPlannerRender: React.FC<{ ast: ResearchPlannerAst }> = ({ ast }) => {
  const reasoning = ast.reasoning?.getValue() || '';
  const subproblems = ast.subproblems?.getValue() || [];

  if (!reasoning && subproblems.length === 0) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        待执行
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 max-w-2xl">
      {reasoning && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            分解策略
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="text-[10px] text-foreground whitespace-pre-wrap">{reasoning}</div>
          </div>
        </div>
      )}

      {subproblems.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            研究子问题（{subproblems.length}）
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {subproblems.map((problem, i) => (
              <SubproblemItem key={i} problem={problem} index={i} total={subproblems.length} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

@Injectable()
export class ResearchPlannerAstRender {
  @Render(ResearchPlannerAst)
  render(ast: ResearchPlannerAst) {
    return <ResearchPlannerRender ast={ast} />;
  }
}
