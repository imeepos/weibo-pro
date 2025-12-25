import React from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { ClaudeCodeRefactorAst } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { Textarea } from '@sker/ui/components/ui/textarea';

const ClaudeCodeRefactorPreview = ({ ast }: { ast: ClaudeCodeRefactorAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <div className="text-lg">♻️</div>
    <div className="text-xs text-slate-300 mt-1">代码重构</div>
  </div>
);

interface ClaudeCodeRefactorSettingProps {
  ast: ClaudeCodeRefactorAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const ClaudeCodeRefactorSetting: React.FC<ClaudeCodeRefactorSettingProps> = ({ ast, onPropertyChange }) => {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">代码</Label>
        <Textarea
          value={ast.code}
          onChange={(e) => onPropertyChange?.('code', e.target.value)}
          placeholder="粘贴要重构的代码..."
          className="min-h-[150px] bg-background font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">语言（可选）</Label>
        <Input
          value={ast.language || ''}
          onChange={(e) => onPropertyChange?.('language', e.target.value)}
          placeholder="例如: TypeScript, Python, Java"
          className="bg-background"
        />
      </div>
    </div>
  );
};

@Injectable()
export class ClaudeCodeRefactorAstRender {
  @Render(ClaudeCodeRefactorAst)
  render(ast: ClaudeCodeRefactorAst, ctx: any) {
    return <div></div>;
  }

  @Preview(ClaudeCodeRefactorAst)
  preview(ast: ClaudeCodeRefactorAst) {
    return <ClaudeCodeRefactorPreview ast={ast} />;
  }

  @Setting(ClaudeCodeRefactorAst)
  setting(ast: ClaudeCodeRefactorAst, onPropertyChange?: (property: string, value: any) => void) {
    return <ClaudeCodeRefactorSetting ast={ast} onPropertyChange={onPropertyChange} />;
  }
}
