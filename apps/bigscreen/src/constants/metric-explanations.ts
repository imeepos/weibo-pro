export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  interpretation: string;
  dataSource: string;
}

export interface MetricExplanation {
  title: string;
  summary: string;
  definitions: MetricDefinition[];
}

export const metricExplanationRegistry = {
  'spread-breadth': {
    title: '传播广度分析',
    summary: '解释转发覆盖面、层级扩散能力与广度指数的当前计算口径。',
    definitions: [
      {
        key: 'uniqueReposters',
        label: '独立转发者',
        description: '去重后的转发用户数量，用于反映真实扩散覆盖面。',
        interpretation: '数值越高，说明传播覆盖到的独立用户越多。',
        dataSource: 'SpreadBreadthController.getAnalysis',
      },
      {
        key: 'spreadDepth',
        label: '传播深度',
        description: '转发链路达到的最大层级。',
        interpretation: '数值越高，说明信息被多层接力传播。',
        dataSource: 'SpreadBreadthController.getAnalysis',
      },
      {
        key: 'breadthIndex',
        label: '传播广度指数',
        description: '当前服务按覆盖率、深度和宽度加权计算的综合指标。',
        interpretation: '接近 1 代表广泛扩散，接近 0 代表扩散有限。',
        dataSource: 'SpreadBreadthController.getAnalysis',
      },
    ],
  },
  'anomaly-timeline': {
    title: '异常检测时间线',
    summary: '解释异常点当前值、预期值与置信度的含义。',
    definitions: [
      {
        key: 'value',
        label: '当前值',
        description: '当前时间点实际观测到的指标值。',
        interpretation: '与预期值差异越大，越可能被识别为异常。',
        dataSource: 'EventsController.getAnomalies',
      },
      {
        key: 'expected',
        label: '预期值',
        description: '基于历史趋势估算出的正常区间参考值。',
        interpretation: '用于对比当前值是否异常偏高或偏低。',
        dataSource: 'EventsController.getAnomalies',
      },
      {
        key: 'confidence',
        label: '置信度',
        description: '当前异常点被识别为异常的可信程度。',
        interpretation: '越接近 100%，越说明该异常点更值得关注。',
        dataSource: 'EventsController.getAnomalies',
      },
    ],
  },
  'sentiment-transition': {
    title: '情感转变追踪',
    summary: '解释稳定性、极化和分析元数据的当前口径。',
    definitions: [
      {
        key: 'stabilityIndex',
        label: '稳定性指数',
        description: '情感时间线波动程度的综合结果。',
        interpretation: '越高说明情感结构更稳定，越低说明波动更强。',
        dataSource: 'SentimentTransitionController.getAnalysis',
      },
      {
        key: 'polarizationIndex',
        label: '极化指数',
        description: '正负情绪两端对立程度的综合结果。',
        interpretation: '越高说明观点越分裂，越低说明情绪更集中或更中性。',
        dataSource: 'SentimentTransitionController.getAnalysis',
      },
      {
        key: 'skippedBoundaryPoints',
        label: '跳过边界点',
        description: '当前算法因窗口不足而跳过的时间点数量。',
        interpretation: '用于说明分析样本点与原始时间点之间的差异。',
        dataSource: 'SentimentTransitionController.getAnalysis',
      },
    ],
  },
} satisfies Record<string, MetricExplanation>;

export type MetricExplanationKey = keyof typeof metricExplanationRegistry;

export const getMetricExplanation = (key: MetricExplanationKey) =>
  metricExplanationRegistry[key];
