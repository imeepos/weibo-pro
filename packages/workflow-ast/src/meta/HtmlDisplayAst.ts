import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: 'HTML 展示',
  type: 'basic'
})
export class HtmlDisplayAst extends Ast {
  @Input({ title: 'HTML 内容', defaultValue: '' })
  html = '';

  @Output({ title: '渲染结果', defaultValue: '' })
  rendered = '';

  type = 'HtmlDisplayAst';
}
