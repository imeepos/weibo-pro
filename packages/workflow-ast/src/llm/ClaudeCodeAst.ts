import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: 'Claude Code',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class ClaudeCodeAst extends Ast {
  @Input({ title: '提示词', type: 'textarea', defaultValue: '' })
  prompt: string = '';

  @Input({ title: '工作目录', type: 'text', defaultValue: '' })
  cwd?: string = '';

  @Input({ title: '文件列表', type: 'textarea', defaultValue: '' })
  files?: string = '';

  @Output({ title: '响应', defaultValue: '' })
  response: string = '';

  type: 'ClaudeCodeAst' = 'ClaudeCodeAst';
}
