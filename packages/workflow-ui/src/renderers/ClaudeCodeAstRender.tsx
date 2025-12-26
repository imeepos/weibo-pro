import React from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { ClaudeCodeAst } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { Textarea } from '@sker/ui/components/ui/textarea';

const ClaudeCodePreview = ({ ast }: { ast: ClaudeCodeAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <div className="text-lg">🤖</div>
    <div className="text-xs text-slate-300 mt-1">Claude Code</div>
  </div>
);

interface ClaudeCodeSettingProps {
  ast: ClaudeCodeAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const ClaudeCodeSetting: React.FC<ClaudeCodeSettingProps> = ({ ast, onPropertyChange }) => {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">提示词</Label>
        <Textarea
          value={ast.prompt}
          onChange={(e) => onPropertyChange?.('prompt', e.target.value)}
          placeholder="输入提示词..."
          className="min-h-[100px] bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">工作目录</Label>
        <Input
          value={ast.cwd || ''}
          onChange={(e) => onPropertyChange?.('cwd', e.target.value)}
          placeholder="例如: /path/to/project"
          className="bg-background"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">文件列表（每行一个）</Label>
        <Textarea
          value={ast.files || ''}
          onChange={(e) => onPropertyChange?.('files', e.target.value)}
          placeholder="例如:\nsrc/index.ts\nsrc/utils.ts"
          className="min-h-[80px] bg-background"
        />
      </div>
    </div>
  );
};

@Injectable()
export class ClaudeCodeAstRender {
  @Render(ClaudeCodeAst)
  render(ast: ClaudeCodeAst, ctx: any) {
    return <div></div>;
  }

  @Preview(ClaudeCodeAst)
  preview(ast: ClaudeCodeAst) {
    return <ClaudeCodePreview ast={ast} />;
  }

  @Setting(ClaudeCodeAst)
  setting(ast: ClaudeCodeAst, onPropertyChange?: (property: string, value: any) => void) {
    return <ClaudeCodeSetting ast={ast} onPropertyChange={onPropertyChange} />;
  }
}
