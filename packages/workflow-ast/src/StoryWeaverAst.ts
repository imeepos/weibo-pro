import { Ast, Input, IS_MULTI, Node, Output } from '@sker/workflow';

export interface Clue {
  id: string;
  description: string;
  status: 'pending' | 'resolved';
  chapterNumber?: number; // 埋下伏笔的章节号
}

export interface ChapterData {
  chapterNumber: number;
  title: string;
  summary: string;
  content: string;
  clues?: Clue[]; // 本章埋下的伏笔
  resolvedClueIds?: string[]; // 本章回填的伏笔ID
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
  @Input({ title: '字数要求', type: 'number', defaultValue: 1500 })
  wordCount: number = 1000;

  @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  model: string = 'deepseek-ai/DeepSeek-V3.2';

  @Input({ title: '温度', defaultValue: 0.8 })
  temperature: number = 0.8;

  @Input({ title: '启用质检', type: 'boolean', defaultValue: true })
  enableQualityCheck: boolean = true;

  @Input({ title: '最低质量分数', type: 'number', defaultValue: 70 })
  minQualityScore: number = 70;

  @Input({ title: '最大重写次数', type: 'number', defaultValue: 2 })
  maxRewriteRetries: number = 2;

  @Input({ title: '目标章节数', type: 'number', defaultValue: 10 })
  targetChapterCount: number = 10;

  @Output({ title: '前文章节（自动累积）', defaultValue: [] })
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

  @Output({ title: '继续生成（循环触发）', defaultValue: '', isRouter: true })
  nextPrompt: string = '';

  @Output({ title: '生成完成', defaultValue: false })
  isComplete: boolean = false;

  type: 'StoryWeaverAst' = 'StoryWeaverAst';
}
