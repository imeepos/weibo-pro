import React from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting } from '@sker/workflow';
import { AnswerEvaluatorAst, EvaluationType } from '@sker/workflow-ast';

const EvaluationTypeLabels: Record<EvaluationType, string> = {
  definitive: '明确性',
  freshness: '时效性',
  plurality: '数量充足',
  completeness: '完整性',
  strict: '严格评估',
};

const EvaluationTypeColors: Record<EvaluationType, string> = {
  definitive: 'bg-blue-500/20 text-blue-400',
  freshness: 'bg-green-500/20 text-green-400',
  plurality: 'bg-purple-500/20 text-purple-400',
  completeness: 'bg-orange-500/20 text-orange-400',
  strict: 'bg-red-500/20 text-red-400',
};

const AnswerEvaluatorRender: React.FC<{ ast: AnswerEvaluatorAst }> = ({ ast }) => {
  const results = ast.results?.getValue() || [];
  const totalScore = ast.totalScore?.getValue() || 0;
  const passed = ast.passed?.getValue() || false;

  if (results.length === 0) {
    return (
      <div className="p-3 text-center text-muted-foreground text-sm">
        等待评估...
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 max-w-md">
      {/* 总体评分 */}
      <div className={`p-3 rounded-lg border ${
        passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">
            {passed ? '✓ 评估通过' : '✗ 评估未通过'}
          </div>
          <div className="text-lg font-bold text-foreground">
            {totalScore.toFixed(0)}
          </div>
        </div>
      </div>

      {/* 各维度评估结果 */}
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg border transition-all ${
              result.passed
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={`px-1.5 py-0.5 text-[10px] rounded whitespace-nowrap ${
                EvaluationTypeColors[result.type]
              }`}>
                {EvaluationTypeLabels[result.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${
                    result.passed ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {result.score}分
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {result.reason}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface EvaluatorSettingProps {
  ast: AnswerEvaluatorAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const EvaluatorSetting: React.FC<EvaluatorSettingProps> = ({ ast, onPropertyChange }) => {
  const allTypes: EvaluationType[] = ['definitive', 'freshness', 'plurality', 'completeness', 'strict'];
  const selectedTypes = ast.evaluationTypes || [];

  const toggleType = (type: EvaluationType) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    onPropertyChange?.('evaluationTypes', newTypes);
  };

  return (
    <div className="space-y-3 p-3">
      {/* 评估类型选择 */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          评估维度
        </div>
        <div className="space-y-1">
          {allTypes.map((type) => {
            const isSelected = selectedTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`w-full text-left p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-accent/50 border-border'
                    : 'bg-muted/50 border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                    EvaluationTypeColors[type]
                  }`}>
                    {EvaluationTypeLabels[type]}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] text-accent-foreground ml-auto">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 模型配置 */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          模型配置
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-muted-foreground">温度</label>
            <input
              type="number"
              value={ast.temperature}
              onChange={(e) => onPropertyChange?.('temperature', parseFloat(e.target.value))}
              min={0}
              max={1}
              step={0.1}
              className="w-full px-2 py-1 text-xs rounded border border-border bg-muted/50 text-foreground"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">模型</label>
            <input
              type="text"
              value={ast.model}
              onChange={(e) => onPropertyChange?.('model', e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-border bg-muted/50 text-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

@Injectable()
export class AnswerEvaluatorAstRender {
  @Render(AnswerEvaluatorAst)
  render(ast: AnswerEvaluatorAst) {
    return <AnswerEvaluatorRender ast={ast} />;
  }

  @Setting(AnswerEvaluatorAst)
  setting(ast: AnswerEvaluatorAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <EvaluatorSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }
}
