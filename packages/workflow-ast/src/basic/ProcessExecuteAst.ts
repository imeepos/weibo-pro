import { Ast, Input, Node, Output, State } from '@sker/workflow'

export interface ProcessEnvironmentVariable {
  key: string
  value: string
}

@Node({
  title: '进程执行',
  type: 'basic',
  errorStrategy: 'retry',
  maxRetries: 2,
  retryDelay: 1000,
  retryBackoff: 2
})
export class ClaudeCodeAst extends Ast {
  @Input({ title: '命令路径/名称' })
  command: string = ''

  @State({
    title: '命令参数', defaultValue: [
      '--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio', '--dangerously-skip-permissions'
    ]
  })
  args: string[] = [
    '--output-format', 'stream-json', '--verbose', '--permission-prompt-tool', 'stdio', '--dangerously-skip-permissions'
  ]

  @Input({ title: 'stdin 输入', required: false })
  stdin?: string

  @Output({ title: '进程ID' })
  pid: number = 0

  @Output({ title: '执行耗时（毫秒）' })
  duration: number = 0

  @Output({ title: '输出' })
  stdout: any | null = null;

  @Output({ title: '错误' })
  stderr: any | null = null;

  type: 'ProcessExecuteAst' = 'ProcessExecuteAst'
}
