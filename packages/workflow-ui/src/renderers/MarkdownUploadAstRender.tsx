import React, { useState } from 'react';
import { Injectable } from '@sker/core';
import { Render, Setting, Preview } from '@sker/workflow';
import { MarkdownUploadAst, } from '@sker/workflow-ast';
import { Input } from '@sker/ui/components/ui/input';
import { Label } from '@sker/ui/components/ui/label';
import { FileText } from 'lucide-react';

const MarkdownPreview = ({ ast }: { ast: MarkdownUploadAst }) => (
  <div className="flex flex-col items-center justify-center h-16 bg-slate-700/50">
    <FileText className="size-6 text-slate-300" />
    <div className="text-xs text-slate-300 mt-1">
      {ast.fileUrl ? '已配置' : '未配置'}
    </div>
  </div>
);

interface MarkdownSettingProps {
  ast: MarkdownUploadAst;
  onPropertyChange?: (property: string, value: any) => void;
}

const MarkdownSetting: React.FC<MarkdownSettingProps> = ({ ast, onPropertyChange }) => {
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPropertyChange?.('fileUrl', e.target.value);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">文件 URL</Label>
        <Input
          type="text"
          placeholder="https://example.com/document.md"
          value={ast.fileUrl}
          onChange={handleUrlChange}
          className="bg-background text-foreground"
        />
        <p className="text-xs text-muted-foreground">
          支持任何可访问的 Markdown 文件 URL
        </p>
      </div>
    </div>
  );
};

const MarkdownRender: React.FC<{ ast: MarkdownUploadAst }> = ({ ast }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'headings'>('preview');

  if (ast.state === 'pending') return null;

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          预览
        </button>
        <button
          onClick={() => setActiveTab('headings')}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'headings'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          标题 ({ast.headings.length})
        </button>
      </div>

      {activeTab === 'preview' && ast.htmlContent && (
        <div className="space-y-2">
          <div
            className="prose prose-invert max-w-none max-h-[400px] overflow-auto p-4 rounded-lg bg-accent/50 border border-border"
            dangerouslySetInnerHTML={{ __html: ast.htmlContent }}
          />
        </div>
      )}

      {activeTab === 'headings' && ast.headings.length > 0 && (
        <div className="space-y-2">
          <div className="max-h-[400px] overflow-auto p-4 rounded-lg bg-accent/50 border border-border">
            <ul className="space-y-1">
              {ast.headings.map((heading, index) => (
                <li
                  key={index}
                  style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
                  className="text-sm text-foreground"
                >
                  <span className="text-muted-foreground mr-2">H{heading.level}</span>
                  {heading.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {ast.plainText && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            纯文本 ({ast.plainText.length} 字符)
          </div>
          <details className="group">
            <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">
              点击查看
            </summary>
            <div className="mt-2 max-h-[200px] overflow-auto p-2 rounded-lg bg-accent/50 border border-border">
              <pre className="text-xs text-foreground whitespace-pre-wrap break-all">
                {ast.plainText}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

@Injectable()
export class MarkdownUploadAstRender {
  @Render(MarkdownUploadAst)
  render(ast: MarkdownUploadAst) {
    return <MarkdownRender ast={ast} />;
  }

  @Setting(MarkdownUploadAst)
  setting(ast: MarkdownUploadAst, handlePropertyChange?: (property: string, value: any) => void) {
    return <MarkdownSetting ast={ast} onPropertyChange={handlePropertyChange} />;
  }

  @Preview(MarkdownUploadAst)
  preview(ast: MarkdownUploadAst) {
    return <MarkdownPreview ast={ast} />;
  }
}
