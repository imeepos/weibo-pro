import { Ast, Input, Node, Output } from '@sker/workflow';
import type { WeiboPostEntity } from '@sker/entities';
import type { CompleteAnalysisResult } from '@sker/nlp';
import { BehaviorSubject } from 'rxjs';

@Node({ title: '事件自动创建器', type: 'crawler' })
export class EventAutoCreatorAst extends Ast {
  @Input({ title: 'NLP 分析结果' })
  nlpResult!: CompleteAnalysisResult;

  @Input({ title: '帖子实体' })
  post!: WeiboPostEntity;

  @Output({ title: '结束' })
  is_end: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  type: 'EventAutoCreatorAst' = 'EventAutoCreatorAst';
}
