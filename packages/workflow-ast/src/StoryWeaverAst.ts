import { Ast, Input, IS_MULTI, Node, Output, State } from '@sker/workflow';

export interface ChapterData {
  chapterNumber: number;
  title: string;
  summary: string;
  content: string;
}

@Node({
  title: '故事编织者',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2,
  stateful: true
})
export class StoryWeaverAst extends Ast {
  @Input({ title: '故事提示', type: 'textarea', mode: IS_MULTI, defaultValue: [] })
  prompt: string[] = [];

  @Input({ title: '风格设定', type: 'textarea', defaultValue: '文学性、情节跌宕、人物鲜活' })
  style: string = '';

  @Input({ title: '字数要求', type: 'number', defaultValue: 3000 })
  wordCount: number = 3000;

  @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  model: string = 'deepseek-ai/DeepSeek-V3.2';

  @Input({ title: '温度', defaultValue: 0.8 })
  temperature: number = 0.8;

  @State({ title: '前文章节（自动累积）' })
  previousChapters: ChapterData[] = [];

  @Output({ title: '章节标题', defaultValue: '' })
  title = '';

  @Output({ title: '章节简介', defaultValue: '' })
  summary = '';

  @Output({ title: '章节内容', defaultValue: '' })
  content = '';

  @Output({ title: '章节号', defaultValue: 0 })
  chapterNumber = 0;

  @Output({ title: '章节数据', defaultValue: null })
  chapterData: ChapterData | null = null;

  type: 'StoryWeaverAst' = 'StoryWeaverAst';
}
