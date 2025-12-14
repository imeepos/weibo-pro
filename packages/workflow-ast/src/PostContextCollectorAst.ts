import { Ast, Input, Node, Output } from '@sker/workflow';
import { BehaviorSubject } from 'rxjs';
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
  post = new BehaviorSubject<WeiboPostEntity | undefined>(undefined);

  @Output({ title: '评论列表' })
  comments = new BehaviorSubject<WeiboCommentEntity[]>([]);

  @Output({ title: '转发列表' })
  reposts = new BehaviorSubject<WeiboRepostEntity[]>([]);

  type: 'PostContextCollectorAst' = 'PostContextCollectorAst';
}
