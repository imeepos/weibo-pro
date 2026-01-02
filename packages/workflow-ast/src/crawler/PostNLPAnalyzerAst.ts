import type { WeiboCommentEntity, WeiboPostEntity, WeiboRepostEntity } from '@sker/entities';
import type { CompleteAnalysisResult } from '@sker/nlp';
import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: '帖子 NLP 分析器',
  type: 'crawler',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class PostNLPAnalyzerAst extends Ast {
  @Input({ title: '帖子实体', defaultValue: null })
  post!: WeiboPostEntity;

  @Input({ title: '评论列表', defaultValue: [] })
  comments!: WeiboCommentEntity[];

  @Input({ title: '转发列表', defaultValue: [] })
  reposts!: WeiboRepostEntity[];

  @Input({ title: '事件ID', defaultValue: '' })
  event_id: string = '';

  @Output({ title: 'NLP 分析结果', defaultValue: '' })
  nlpResult: CompleteAnalysisResult | string = ``;

  @Output({ title: '已关联事件', defaultValue: false })
  event_associated = false;

  @Output({ title: '失败数量', defaultValue: 0 })
  failedCount: number = 0;

  @Output({ title: '错误详情', defaultValue: [] })
  errors: Array<{ postId?: string; error: string }> = [];

  type: 'PostNLPAnalyzerAst' = 'PostNLPAnalyzerAst';
}
