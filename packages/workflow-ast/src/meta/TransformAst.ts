import { Ast, Input, Node, Output, State } from '@sker/workflow';

@Node({
  title: '数据转换',
  type: 'basic',
  errorStrategy: 'fail'
})
export class TransformAst extends Ast {
  @State({ title: '转换表达式' })
  expression = '';

  @Input({ title: '输入数据', defaultValue: null })
  input: any = null;

  @Output({ title: '输出数据', defaultValue: null })
  output: any = null;

  type: 'TransformAst' = 'TransformAst';
}
