import { Ast, Input, Node, Output, State } from "@sker/workflow";
import { BehaviorSubject } from "rxjs";

export type EvaluationType = 'definitive' | 'freshness' | 'plurality' | 'completeness' | 'strict';

export interface EvaluationResult {
  type: EvaluationType;
  passed: boolean;
  score: number;
  reason: string;
}

@Node({
  title: '答案评估器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 2,
  retryDelay: 1000,
  retryBackoff: 1.5
})
export class AnswerEvaluatorAst extends Ast {

  @Input({ title: '问题', type: 'textarea' })
  question: string = '';

  @Input({ title: '答案', type: 'textarea' })
  answer: string = '';

  @State({ title: '评估类型' })
  evaluationTypes: EvaluationType[] = ['definitive', 'completeness'];

  @State({ title: '温度' })
  temperature: number = 0.3;

  @State({ title: '模型' })
  model: string = 'deepseek-ai/DeepSeek-V3';

  @Output({ title: '评估结果' })
  results: BehaviorSubject<EvaluationResult[]> = new BehaviorSubject<EvaluationResult[]>([]);

  @Output({ title: '是否通过' })
  passed: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  @Output({ title: '总分' })
  totalScore: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  type: 'AnswerEvaluatorAst' = 'AnswerEvaluatorAst';
}
