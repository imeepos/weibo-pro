import { Ast, Input, Node, Output } from '@sker/workflow';

/**
 * 透传节点 - 接收输入立即发射，用于形成循环
 *
 * 使用场景：
 * - 当需要形成循环但不支持自循环时
 * - 作为数据中转站
 */
@Node({
  title: '透传节点',
  type: 'basic'
})
export class PassThroughAst extends Ast {
  @Input({ title: '输入', defaultValue: '' })
  input: any = '';

  @Output({ title: '输出', defaultValue: '' })
  output: any = '';

  type: 'PassThroughAst' = 'PassThroughAst';
}
