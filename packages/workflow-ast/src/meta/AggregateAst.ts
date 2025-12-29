import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output, State } from '@sker/workflow';

export type AggregateOperation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'concat' | 'merge';

@Node({
  title: '数据聚合',
  type: 'basic',
  errorStrategy: 'fail'
})
export class AggregateAst extends Ast {
  @Input({
    title: '聚合操作',
    type: 'select',
    options: ['sum', 'avg', 'min', 'max', 'count', 'concat', 'merge']
  })
  operation: AggregateOperation = 'concat';

  @Input({ title: '输入数据', mode: IS_MULTI | IS_BUFFER, defaultValue: [] })
  inputs: any[] = [];

  @Output({ title: '聚合结果', defaultValue: null })
  result: any = null;

  type: 'AggregateAst' = 'AggregateAst';
}
