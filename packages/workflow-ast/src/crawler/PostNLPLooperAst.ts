import { Ast, Input, Node, Output, State } from '@sker/workflow';
import type { WeiboPostEntity } from '@sker/entities';

/**
 * 帖子 NLP 循环器
 *
 * 功能：找出所有没有 NLP 记录的帖子，逐个发射
 *
 * 使用游标分页避免重复，避免内存溢出
 */
@Node({
  title: '帖子 NLP 循环器',
  type: 'crawler',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class PostNLPLooperAst extends Ast {
  /**
   * 每批处理数量（控制内存）
   */
  @Input({ title: '每批数量', type: 'number', defaultValue: 10 })
  pageSize: number = 10;

  /**
   * 游标：最后处理的帖子 ID
   */
  @State({ title: '游标' })
  cursorId: string | null = null;

  @Input({ title: '下一页', type: 'boolean', defaultValue: true })
  nextPage: boolean = true;

  /**
   * 发射的帖子
   */
  @Output({ title: '帖子ID' })
  postId!: string;

  @Output({ title: '事件ID', defaultValue: null })
  event_id!: string | null;

  @Output({ title: '是否有下一页', isRouter: true, defaultValue: true })
  hasMore!: boolean;

  type: 'PostNLPLooperAst' = 'PostNLPLooperAst';
}
