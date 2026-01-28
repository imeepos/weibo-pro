import { Ast, Input, Node, Output, State } from '@sker/workflow';

@Node({
  title: '事件发射器',
  type: 'basic',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2
})
export class EventEmitterAst extends Ast {
  @Input({ title: '触发', defaultValue: true })
  trigger: boolean = true;

  @Input({ title: '发射间隔(毫秒)', type: 'number', defaultValue: 0 })
  delay: number = 0;

  @State({ title: '当前索引' })
  currentIndex: number = 0;

  @State({ title: '总事件数' })
  totalEvents: number = 0;

  @State({ title: '已处理事件数' })
  processedEvents: number = 0;

  @State({ title: '处理进度' })
  progress: number = 0;

  @Output({ title: '事件ID', defaultValue: '' })
  eventId: string = '';

  @Output({ title: '事件标题', defaultValue: '' })
  eventTitle: string = '';

  @Output({ title: '当前索引', defaultValue: 0 })
  index: number = 0;

  @Output({ title: '总数', defaultValue: 0 })
  total: number = 0;

  @Output({ title: '是否最后一个', defaultValue: false })
  isLast: boolean = false;

  type: 'EventEmitterAst' = 'EventEmitterAst';
}
