import { Ast, Input, Node, Output } from '@sker/workflow';
import type {
  WeiboCommentEntity,
  WeiboPostEntity,
  WeiboRepostEntity,
} from '@sker/entities';
import type { CompleteAnalysisResult } from '@sker/nlp';
import { BehaviorSubject } from 'rxjs';

@Node({
  title: '帖子 NLP 分析器',
  type: 'crawler',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class PostNLPAnalyzerAst extends Ast {
  @Input({ title: '帖子实体' })
  post!: WeiboPostEntity;

  @Input({ title: '评论列表' })
  comments!: WeiboCommentEntity[];

  @Input({ title: '转发列表' })
  reposts!: WeiboRepostEntity[];

  @Output({ title: 'NLP 分析结果' })
  nlpResult: BehaviorSubject<CompleteAnalysisResult | undefined> = new BehaviorSubject<CompleteAnalysisResult | undefined>(undefined);

  type: 'PostNLPAnalyzerAst' = 'PostNLPAnalyzerAst';
}
