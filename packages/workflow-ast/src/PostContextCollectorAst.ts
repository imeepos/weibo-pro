import { Ast, Input, Node, Output } from '@sker/workflow';
import type {
  WeiboCommentEntity,
  WeiboPostEntity,
  WeiboRepostEntity,
} from '@sker/entities';

@Node({ title: '帖子上下文收集器', type: 'crawler' })
export class PostContextCollectorAst extends Ast {
  @Input({ title: '帖子ID' })
  postId: string = '';

  @Input({ isMulti: true, title: '开始' })
  canStart: boolean[] = [];

  @Output({ title: '帖子实体' })
  post!: WeiboPostEntity;

  @Output({ title: '评论列表' })
  comments!: WeiboCommentEntity[];

  @Output({ title: '转发列表' })
  reposts!: WeiboRepostEntity[];

  type: 'PostContextCollectorAst' = 'PostContextCollectorAst';
}
