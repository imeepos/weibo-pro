import { Ast, Input, Node, Output } from '@sker/workflow';

export type CodeLanguage = 'javascript' | 'python';

export interface ExecutionLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
}

@Node({ title: '代码执行器' })
export class CodeExecutorAst extends Ast {
  @Input({ title: '编程语言', type: 'select' })
  language: CodeLanguage = 'javascript';

  @Input({ title: '源代码', type: 'code' })
  code!: string;

  @Input({ title: '超时时间（秒）', type: 'number' })
  timeout: number = 30;

  @Input({ title: '上下文数据' })
  context: Record<string, any> = {};

  @Output({ title: '执行结果' })
  result: any;

  @Output({ title: '执行日志' })
  logs: ExecutionLog[] = [];

  @Output({ title: '执行时间（毫秒）' })
  executionTime: number = 0;

  type: 'CodeExecutorAst' = 'CodeExecutorAst';
}
