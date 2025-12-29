import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: 'Claude 代码审查',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class ClaudeCodeReviewAst extends Ast {
  @Input({ title: '代码', type: 'textarea', defaultValue: '' })
  code: string = '';

  @Input({ title: '语言', type: 'text', defaultValue: '' })
  language?: string = '';

  @Output({ title: '审查结果', defaultValue: '' })
  result: string = '';

  type: 'ClaudeCodeReviewAst' = 'ClaudeCodeReviewAst';
}
