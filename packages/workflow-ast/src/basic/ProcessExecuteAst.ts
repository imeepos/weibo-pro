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
export class ProcessExecuteAst extends Ast {
  @State({ title: '命令路径/名称' })
  command: string = ''

  @State({ title: '命令参数' })
  args: string[] = []

  @State({ title: '工作目录' })
  cwd?: string

  @State({ title: '环境变量' })
  envVars?: ProcessEnvironmentVariable[]

  @Input({ title: 'stdin 输入', required: false })
  stdin?: string

  @Output({ title: '进程ID' })
  pid: number = 0

  @Output({ title: '执行耗时（毫秒）' })
  duration: number = 0

  type: 'ProcessExecuteAst' = 'ProcessExecuteAst'
}
