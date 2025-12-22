import { Ast, Input, Node, Output, State } from '@sker/workflow';

@Node({
  title: '属性选择器',
  type: 'basic',
  errorStrategy: 'fail',
})
export class PropertySelectorAst extends Ast {
  @State({ title: '属性路径' })
  path: string = '';

  @Input({ title: '数据', defaultValue: null })
  data: any = null;

  @Output({ title: '提取值', defaultValue: null })
  value: any = null;

  type: 'PropertySelectorAst' = 'PropertySelectorAst';
}
