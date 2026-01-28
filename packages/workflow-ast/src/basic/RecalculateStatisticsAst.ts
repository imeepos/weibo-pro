import { Ast, Input, Node, Output, State } from '@sker/workflow';

export interface StatisticsResult {
  postCount: number;
  commentCount: number;
  likeCount: number;
  repostCount: number;
  uniqueUserCount: number;
}

@Node({
  title: '重新计算统计数据',
  type: 'basic',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class RecalculateStatisticsAst extends Ast {
  @Input({ title: '事件ID', defaultValue: '', required: true })
  eventId: string = '';

  @Input({ title: '开始日期', type: 'datetime-local', defaultValue: null })
  startDate: Date | null = null;

  @Input({ title: '结束日期', type: 'datetime-local', defaultValue: null })
  endDate: Date | null = null;

  @Input({ title: '清空现有数据', type: 'boolean', defaultValue: true })
  clearExisting: boolean = true;

  @Input({ title: '批处理大小', type: 'number', defaultValue: 100 })
  batchSize: number = 100;

  @State({ title: '当前步骤' })
  currentStep: string = '';

  @State({ title: '总步骤数' })
  totalSteps: number = 7;

  @State({ title: '已完成步骤' })
  completedSteps: number = 0;

  @State({ title: '处理进度' })
  progress: number = 0;

  @State({ title: '错误信息' })
  errors: string[] = [];

  @Output({ title: '事件ID', defaultValue: '' })
  outputEventId: string = '';

  @Output({ title: '总小时数', defaultValue: 0 })
  totalHours: number = 0;

  @Output({ title: '已处理小时数', defaultValue: 0 })
  processedHours: number = 0;

  @Output({ title: '统计结果', defaultValue: null })
  statistics: StatisticsResult | null = null;

  @Output({ title: '是否成功', defaultValue: false })
  success: boolean = false;

  type: 'RecalculateStatisticsAst' = 'RecalculateStatisticsAst';
}
