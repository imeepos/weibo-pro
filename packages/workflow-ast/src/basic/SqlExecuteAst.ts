import { Ast, Input, Node, Output, State } from '@sker/workflow';

export interface SqlParameter {
  key: string;
  value: any;
}

export interface SqlColumn {
  name: string;
  type: string;
}

@Node({
  title: 'SQL 执行',
  type: 'basic',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class SqlExecuteAst extends Ast {
  @State({ title: 'SQL 语句' })
  sql = '';

  @State({ title: '参数' })
  parameters: SqlParameter[] = [];

  @Input({ title: '触发', defaultValue: true })
  trigger: boolean = true;

  @Output({ title: '结果集', defaultValue: [] })
  results: any[] = [];

  @Output({ title: '影响行数', defaultValue: 0 })
  affectedRows = 0;

  @Output({ title: '列信息', defaultValue: [] })
  columns: SqlColumn[] = [];

  type: 'SqlExecuteAst' = 'SqlExecuteAst';
}
