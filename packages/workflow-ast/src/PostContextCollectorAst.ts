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
  post: BehaviorSubject<WeiboPostEntity | undefined> = new BehaviorSubject<WeiboPostEntity | undefined>(undefined);

  @Output({ title: '评论列表' })
  comments: BehaviorSubject<WeiboCommentEntity[] | undefined> = new BehaviorSubject<WeiboCommentEntity[] | undefined>(undefined);

  @Output({ title: '转发列表' })
  reposts: BehaviorSubject<WeiboRepostEntity[] | undefined> = new BehaviorSubject<WeiboRepostEntity[] | undefined>(undefined);

  type: 'PostContextCollectorAst' = 'PostContextCollectorAst';
}
