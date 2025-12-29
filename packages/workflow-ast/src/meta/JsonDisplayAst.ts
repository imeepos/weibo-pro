import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: 'JSON 展示',
  type: 'basic'
})
export class JsonDisplayAst extends Ast {
  @Input({ title: 'JSON 数据', type: 'object', defaultValue: null })
  json: any = null;

  @Output({ title: '格式化结果', defaultValue: '' })
  formatted = '';

  type: 'JsonDisplayAst' = 'JsonDisplayAst';
}
