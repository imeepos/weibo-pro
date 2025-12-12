import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { ErrorAnalyzerAst } from '@sker/workflow-ast';

const AnalysisSection: React.FC<{
  title: string;
  content: string;
  color: string;
  icon: string;
}> = ({ title, content, color, icon }) => {
  if (!content) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs">{icon}</span>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
      </div>
      <div className={`p-2.5 rounded-lg border ${color}`}>
        <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
};

const ErrorAnalyzerRender: React.FC<{ ast: ErrorAnalyzerAst }> = ({ ast }) => {
  const recap = ast.recap?.getValue() || '';
  const blame = ast.blame?.getValue() || '';
  const improvement = ast.improvement?.getValue() || '';

  if (!recap && !blame && !improvement) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        待执行
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 max-w-2xl">
      <AnalysisSection
        title="总结"
        content={recap}
        color="bg-blue-500/10 border-blue-500/30"
        icon="📋"
      />

      <AnalysisSection
        title="错误定位"
        content={blame}
        color="bg-red-500/10 border-red-500/30"
        icon="🎯"
      />

      <AnalysisSection
        title="改进建议"
        content={improvement}
        color="bg-green-500/10 border-green-500/30"
        icon="💡"
      />
    </div>
  );
};

@Injectable()
export class ErrorAnalyzerAstRender {
  @Render(ErrorAnalyzerAst)
  render(ast: ErrorAnalyzerAst) {
    return <ErrorAnalyzerRender ast={ast} />;
  }
}
