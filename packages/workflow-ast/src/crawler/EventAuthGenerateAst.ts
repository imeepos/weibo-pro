import { Ast, Input, Node, Output } from '@sker/workflow';
import type { EventEntity } from '@sker/entities';

@Node({
  title: '事件授权生成器',
  type: 'crawler',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class EventAuthGenerateAst extends Ast {
  @Input({ title: '用户输入数据', type: 'textarea', defaultValue: '' })
  userInput: string = '';

  @Input({ title: '系统提示词模板', type: 'textarea', defaultValue: '' })
  systemPromptTemplate: string = '';

  @Input({ title: 'LLM 模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  model: string = 'deepseek-ai/DeepSeek-V3.2';

  @Input({ title: '温度', defaultValue: 0.3 })
  temperature: number = 0.3;

  @Input({ title: '强制插入', defaultValue: false })
  forceInsert: boolean = false;

  @Output({ title: '生成的事件实体', defaultValue: null })
  event: EventEntity | null = null;

  @Output({ title: '事件ID', defaultValue: '' })
  event_id: string = '';

  @Output({ title: '事件标题', defaultValue: '' })
  event_title: string = '';

  @Output({ title: '是否插入成功', defaultValue: false })
  insertSuccess: boolean = false;

  @Output({ title: '是否已存在', defaultValue: false })
  alreadyExists: boolean = false;

  @Output({ title: '错误信息', defaultValue: '' })
  errorMessage: string = '';

  type = 'EventAuthGenerateAst';
}
