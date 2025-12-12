import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { QueryRewriterAst } from '@sker/workflow-ast';

const QueryItem: React.FC<{ query: string; index: number }> = ({ query, index }) => {
  const colors = [
    'bg-red-500/20 text-red-400 border-red-500/30',
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-green-500/20 text-green-400 border-green-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ];
  const color = colors[index % colors.length];

  return (
    <div className={`p-2 rounded-lg border ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-medium text-muted-foreground">#{index + 1}</span>
      </div>
      <div className="text-xs font-medium text-foreground">{query}</div>
    </div>
  );
};

const QueryRewriterRender: React.FC<{ ast: QueryRewriterAst }> = ({ ast }) => {
  const reasoning = ast.reasoning?.getValue() || '';
  const queries = ast.subQueries?.getValue() || [];

  if (!reasoning && queries.length === 0) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        待执行
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 max-w-md">
      {reasoning && (
        <div className="space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            推理过程
          </div>
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/30">
            <div className="text-[10px] text-foreground whitespace-pre-wrap">{reasoning}</div>
          </div>
        </div>
      )}

      {queries.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            子查询（{queries.length}）
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {queries.map((q, i) => (
              <QueryItem key={i} query={q} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

@Injectable()
export class QueryRewriterAstRender {
  @Render(QueryRewriterAst)
  render(ast: QueryRewriterAst) {
    return <QueryRewriterRender ast={ast} />;
  }
}
