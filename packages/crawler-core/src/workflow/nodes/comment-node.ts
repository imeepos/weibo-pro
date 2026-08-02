import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: '评论节点',
  type: 'crawler',
  errorStrategy: 'retry',
  maxRetries: 3
})
export class CommentNodeAst extends Ast {
  @Input({ title: '帖子ID', type: 'text', defaultValue: '' })
  postId: string = '';

  @Input({ title: '最大评论数', type: 'number', defaultValue: 100 })
  maxComments: number = 100;

  @Output({ title: '评论列表' })
  comments: any[] = [];

  type = 'CommentNodeAst';
}
