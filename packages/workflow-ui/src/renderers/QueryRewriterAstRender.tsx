import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { QueryRewriterAst, RewrittenQuery, CognitivePersona } from '@sker/workflow-ast';

const PersonaConfig: Record<CognitivePersona, { label: string; color: string; icon: string }> = {
  'expert-skeptic': { label: '专家怀疑者', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔍' },
  'detail-analyst': { label: '细节分析师', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '📊' },
  'historical': { label: '历史研究者', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '📜' },
  'comparative': { label: '对比思考者', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '⚖️' },
  'temporal': { label: '时效性', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '⏰' },
  'globalizer': { label: '全球化', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: '🌍' },
  'reality-hater': { label: '现实怀疑者', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '🤔' },
};

const QueryItem: React.FC<{ query: RewrittenQuery }> = ({ query }) => {
  const config = PersonaConfig[query.persona];
  return (
    <div className={`p-2 rounded-lg border ${config.color}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{config.icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider">{config.label}</span>
      </div>
      <div className="text-xs font-medium text-foreground mb-1">{query.query}</div>
      <div className="text-[10px] text-muted-foreground">{query.reasoning}</div>
    </div>
  );
};

const IntentAnalysis: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n').filter(Boolean);
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        意图分析
      </div>
      <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/30 space-y-0.5">
        {lines.map((line, i) => (
          <div key={i} className="text-[10px] text-foreground">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

const QueryRewriterRender: React.FC<{ ast: QueryRewriterAst }> = ({ ast }) => {
  const intentText = ast.intentAnalysis?.getValue() || '';
  const queries = ast.rewrittenQueries?.getValue() || [];

  if (!intentText && queries.length === 0) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        待执行
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 max-w-md">
      <IntentAnalysis text={intentText} />

      {queries.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            重写查询（{queries.length}）
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {queries.map((q, i) => (
              <QueryItem key={i} query={q} />
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
