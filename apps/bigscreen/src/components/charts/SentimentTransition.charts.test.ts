import { describe, it, expect } from 'vitest';
import type { SentimentTransitionAnalysis } from '@sker/sdk';
import { getValidSankeyLinks, buildSankeyOption, buildSankeyEmptyOption } from './SentimentTransition.sankey';
import { buildTimelineOption } from './SentimentTransition.timeline';
import {
  buildTurningPointsOption,
  getSentimentColor,
  SENTIMENT_LABELS,
} from './SentimentTransition.turningPoints';

const colors = {
  text: '#111827',
  textMuted: '#6b7280',
  border: 'rgba(0, 0, 0, 0.3)',
  splitLine: 'rgba(0, 0, 0, 0.1)',
  tooltipBg: 'rgba(255, 255, 255, 0.95)',
  tooltipBorder: 'rgba(0, 0, 0, 0.1)',
  toolbox: '#111827',
  emphasis: '#3b82f6',
  chartBg: '#ffffff',
};

const mockData: SentimentTransitionAnalysis = {
  transitionMatrix: {
    positiveToNegative: 10,
    positiveToNeutral: 20,
    negativeToPositive: 15,
    negativeToNeutral: 25,
    neutralToPositive: 30,
    neutralToNegative: 12,
  },
  timeline: [
    { timestamp: '2024-01-01T10:00:00Z', positive: 100, negative: 50, neutral: 80 },
    { timestamp: '2024-01-01T11:00:00Z', positive: 120, negative: 45, neutral: 85 },
  ],
  turningPoints: [
    {
      timestamp: '2024-01-01T10:30:00Z',
      fromSentiment: 'positive',
      toSentiment: 'negative',
      magnitude: 0.75,
    },
  ],
  stabilityIndex: 0.85,
  polarizationIndex: 0.42,
};

describe('桑基图配置', () => {
  it('getValidSankeyLinks 过滤零值连接', () => {
    const data: SentimentTransitionAnalysis = {
      ...mockData,
      transitionMatrix: {
        ...mockData.transitionMatrix,
        positiveToNegative: 0,
        neutralToNegative: 0,
      },
    };
    const links = getValidSankeyLinks(data);
    expect(links.length).toBe(4);
    expect(links.every((link) => link.value > 0)).toBe(true);
  });

  it('buildSankeyOption 构建 sankey 系列与节点', () => {
    const option = buildSankeyOption(mockData, colors);
    const series = option.series[0];
    expect(series.type).toBe('sankey');
    expect(series.links.length).toBe(6);
    expect(series.data.length).toBeGreaterThan(0);
  });

  it('buildSankeyEmptyOption 返回空状态标题', () => {
    const option = buildSankeyEmptyOption(colors);
    expect(option.title.text).toBe('情感转变流向');
    expect(option.title.subtext).toBe('未检测到转变');
  });
});

describe('情感时间线配置', () => {
  it('buildTimelineOption 构建三条情感系列', () => {
    const option = buildTimelineOption(mockData, colors);
    expect(option.series.length).toBe(3);
    expect(option.series.map((s: any) => s.name)).toEqual(['正面', '负面', '中性']);
    expect(option.legend.data).toEqual(['正面', '负面', '中性']);
  });

  it('buildTimelineOption 的 x 轴数据对应时间线长度', () => {
    const option = buildTimelineOption(mockData, colors);
    expect(option.xAxis.data.length).toBe(2);
  });
});

describe('转折点时间轴配置', () => {
  it('getSentimentColor 返回已知情感配色', () => {
    const positive = getSentimentColor('positive');
    expect(positive.base).toBe('rgba(34, 197, 94, 1)');
    expect(positive.light).toBe('rgba(34, 197, 94, 0.15)');
  });

  it('getSentimentColor 支持自定义透明度', () => {
    const negative = getSentimentColor('negative', 0.5);
    expect(negative.base).toBe('rgba(239, 68, 68, 0.5)');
  });

  it('getSentimentColor 未知情感回退中性色', () => {
    const fallback = getSentimentColor('unknown');
    expect(fallback.base).toBe('rgba(156, 163, 175, 1)');
  });

  it('SENTIMENT_LABELS 映射关系正确', () => {
    expect(SENTIMENT_LABELS).toEqual({ positive: '正面', negative: '负面', neutral: '中性' });
  });

  it('buildTurningPointsOption 构建折线与散点系列', () => {
    const option = buildTurningPointsOption(mockData, colors);
    expect(option.series.length).toBe(2);
    expect(option.series[0].type).toBe('line');
    expect(option.series[1].type).toBe('scatter');
    expect(option.series[1].data.length).toBe(1);
    expect(option.series[1].data[0].value).toEqual([0, 75]);
  });
});
