import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({ title: '取最后值', type: 'basic', errorStrategy: 'fail' })
export class LastAst extends Ast {
  @Input({ title: '输入', defaultValue: null })
  input: any = null;

  @Output({ title: '最后值', defaultValue: null })
  last: any = null;

  type = 'LastAst';
}
