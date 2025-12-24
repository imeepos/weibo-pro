import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: '详情节点',
  type: 'crawler',
  errorStrategy: 'retry',
  maxRetries: 3
})
export class DetailNodeAst extends Ast {
  @Input({ title: '帖子ID', type: 'text', defaultValue: '' })
  postId: string = '';

  @Output({ title: '帖子详情' })
  detail: any = null;

  type: 'DetailNodeAst' = 'DetailNodeAst';
}
