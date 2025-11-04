import { Ast, Input, Node, Output } from '@sker/workflow';
import type { EventEntity, WeiboPostEntity } from '@sker/entities';
import type { CompleteAnalysisResult } from '@sker/nlp';

@Node({ title: '事件自动创建器' })
export class EventAutoCreatorAst extends Ast {
  @Input({ title: 'NLP 分析结果' })
  nlpResult!: CompleteAnalysisResult;

  @Input({ title: '帖子实体' })
  post!: WeiboPostEntity;

  @Output({ title: '关联的事件' })
  event!: EventEntity;

  @Output({ title: 'NLP 结果 ID' })
  nlpResultId!: string;

  type: 'EventAutoCreatorAst' = 'EventAutoCreatorAst';
}
