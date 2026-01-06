import { Ast, Input, IS_BUFFER, Node, Output } from '@sker/workflow';

@Node({ title: '取最后值', type: 'basic', errorStrategy: 'fail' })
export class LastAst extends Ast {
  // IS_BUFFER: 调度器收集所有上游数据后执行一次
  @Input({ title: '输入', defaultValue: null })
  input: any = null;

  @Output({ title: '最后值', defaultValue: null })
  last: any = null;

  type: 'LastAst' = 'LastAst';
}
