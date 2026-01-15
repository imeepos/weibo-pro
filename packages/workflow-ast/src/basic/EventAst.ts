import { Ast, Input, Node, Output, State } from '@sker/workflow';
import type { EventEntity } from '@sker/entities';

@Node({
  title: '事件选择器',
  type: 'basic',
  errorStrategy: 'fail',
})
export class EventAst extends Ast {
  @Input({ title: '事件ID' })
  eventId?: string;

  @State({ title: '事件标题' })
  eventTitle?: string;

  @State({ title: '事件分类' })
  eventCategory?: string;

  @Input({ title: '触发', defaultValue: true })
  trigger: boolean = true;

  @Output({ title: '事件', defaultValue: null })
  event: EventEntity | null = null;

  @Output({ title: '事件ID', defaultValue: '' })
  event_id = '';

  @Output({ title: '事件标题', defaultValue: '' })
  event_title = '';

  @Output({ title: '开始时间', defaultValue: '' })
  startTime = '';

  @Output({ title: '关键字列表', defaultValue: [] })
  keywords: string[] = [];

  @Output({ title: '关键字字符串', defaultValue: '' })
  keywords_str = '';

  @Output({ title: '帖子最早时间', defaultValue: '' })
  post_min_time = '';

  @Output({ title: '帖子最晚时间', defaultValue: '' })
  post_max_time = '';

  @Output({ title: '爬取完成', defaultValue: false })
  is_crawl_complete = false;

  type: 'EventAst' = 'EventAst';
}
