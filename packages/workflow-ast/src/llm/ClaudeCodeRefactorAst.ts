import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: 'Claude 代码重构',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class ClaudeCodeRefactorAst extends Ast {
  @Input({ title: '代码', type: 'textarea', defaultValue: '' })
  code: string = '';

  @Input({ title: '语言', type: 'text', defaultValue: '' })
  language?: string = '';

  @Output({ title: '重构后代码', defaultValue: '' })
  refactoredCode: string = '';

  type: 'ClaudeCodeRefactorAst' = 'ClaudeCodeRefactorAst';
}
