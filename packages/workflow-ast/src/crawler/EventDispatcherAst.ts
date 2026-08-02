import { Ast, Input, Node, Output, State } from '@sker/workflow';
import type { EventEntity } from '@sker/entities';

@Node({
  title: '事件分派器',
  type: 'crawler',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class EventDispatcherAst extends Ast {
  @Input({ title: '自定义提示词', type: 'textarea', defaultValue: '' })
  customPrompt: string = '';

  @Input({ title: '限制返回数量', type: 'number', defaultValue: 0 })
  limit: number = 0;

  @Output({ title: '选中的事件ID', defaultValue: '' })
  selectedEventId: string = '';

  @Output({ title: '选中的事件', defaultValue: null })
  selectedEvent: EventEntity | null = null;

  @Output({ title: '事件列表', defaultValue: [] })
  eventsList: EventEntity[] = [];

  @State({ title: '事件总数', type: 'number', defaultValue: 0 })
  totalEvents: number = 0;

  @State({ title: '未爬取数量', type: 'number', defaultValue: 0 })
  uncrawledCount: number = 0;

  type = 'EventDispatcherAst';
}
