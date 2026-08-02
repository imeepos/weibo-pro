import { Ast, Input, Node, Output, State } from '@sker/workflow';

@Node({
  title: '条件路由',
  type: 'control',
  errorStrategy: 'fail',
  dynamicOutputs: true
})
export class RouteAst extends Ast {
  @State({ title: '路由规则' })
  rules: Array<{ condition: string; output: string }> = [];

  @Input({ title: '输入值', defaultValue: null })
  value: any = null;

  @Output({ title: '默认输出', isRouter: true, defaultValue: undefined })
  default: any = undefined;

  type = 'RouteAst';
}
