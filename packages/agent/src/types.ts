/**
 * 自主研究 Agent 类型定义
 */

/** 研究任务 */
export interface ResearchTask {
  id: string;
  query: string;
  timeRange?: string;
  sampleSize?: number;
  constraints?: Record<string, any>;
}

/** 研究计划 */
export interface ResearchPlan {
  steps: ResearchStep[];
  expectedOutput: string;
}

/** 研究步骤 */
export interface ResearchStep {
  id: string;
  tool: string;
  params: Record<string, any>;
  description: string;
  dependsOn?: string[];
}

/** 步骤执行结果 */
export interface StepResult {
  stepId: string;
  data: any;
  timestamp: number;
}

/** 研究报告 */
export interface ResearchReport {
  taskId: string;
  query: string;
  report: string;
  rawData: StepResult[];
  timestamp: number;
}

/** 舆情任务 */
export interface OpinionTask {
  id: string;
  context: {
    postId: string;
    content: string;
    comments: string[];
    subComments: string[];
    reposts: string[];
  };
  history: Array<{ sentiment: any; timestamp: number }>;
}

/** 舆情报告 */
export interface OpinionReport {
  taskId: string;
  analysis: any;
  trend: {
    direction: 'rising' | 'falling' | 'stable';
    magnitude: number;
  };
  risk: {
    level: 'low' | 'medium' | 'high';
    score: number;
    reasons: string[];
  };
  timestamp: number;
}
