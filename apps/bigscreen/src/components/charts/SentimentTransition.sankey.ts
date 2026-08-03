/**
 * 情感转变组件 —— 桑基图（转变流向）
 *
 * 拆分为纯函数（option 构建）与副作用（echarts 渲染）两层，
 * 构建逻辑可脱离 DOM 单独测试。
 */
import * as echarts from 'echarts';
import type { SentimentTransitionAnalysis } from '@sker/sdk';
import type { EChartThemeColors } from '@sker/ui/hooks/use-echart-theme';

/** 源节点后缀：确保 Sankey 图为单向 DAG */
const SOURCE_SUFFIX = '（源）';
/** 目标节点后缀 */
const TARGET_SUFFIX = '（目标）';

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

/** 构建桑基图连接（不包含自环，如 Positive -> Positive） */
export function buildSankeyLinks(
  matrix: SentimentTransitionAnalysis['transitionMatrix'],
): SankeyLink[] {
  return [
    { source: `正面${SOURCE_SUFFIX}`, target: `负面${TARGET_SUFFIX}`, value: matrix.positiveToNegative },
    { source: `正面${SOURCE_SUFFIX}`, target: `中性${TARGET_SUFFIX}`, value: matrix.positiveToNeutral },
    { source: `负面${SOURCE_SUFFIX}`, target: `正面${TARGET_SUFFIX}`, value: matrix.negativeToPositive },
    { source: `负面${SOURCE_SUFFIX}`, target: `中性${TARGET_SUFFIX}`, value: matrix.negativeToNeutral },
    { source: `中性${SOURCE_SUFFIX}`, target: `正面${TARGET_SUFFIX}`, value: matrix.neutralToPositive },
    { source: `中性${SOURCE_SUFFIX}`, target: `负面${TARGET_SUFFIX}`, value: matrix.neutralToNegative },
  ];
}

/** 过滤掉值为 0 的连接，得到有效连接 */
export function getValidSankeyLinks(data: SentimentTransitionAnalysis): SankeyLink[] {
  return buildSankeyLinks(data.transitionMatrix).filter((link) => link.value > 0);
}

/** 根据有效连接动态生成节点 */
function buildSankeyNodes(validLinks: SankeyLink[]): Array<{ name: string }> {
  const nodeSet = new Set<string>();
  validLinks.forEach((link) => {
    nodeSet.add(link.source);
    nodeSet.add(link.target);
  });
  return Array.from(nodeSet).map((name) => ({ name }));
}

/** 空状态配置（未检测到转变） */
export function buildSankeyEmptyOption(colors: EChartThemeColors) {
  return {
    title: {
      text: '情感转变流向',
      subtext: '未检测到转变',
      left: 'center',
      top: 'center',
      textStyle: {
        color: colors.text,
      },
      subtextStyle: {
        color: colors.textMuted,
      },
    },
  };
}

/** 构建桑基图完整配置（仅在存在有效连接时使用） */
export function buildSankeyOption(data: SentimentTransitionAnalysis, colors: EChartThemeColors) {
  const validLinks = getValidSankeyLinks(data);
  const nodes = buildSankeyNodes(validLinks);

  return {
    title: {
      text: '情感转变流向',
      left: 'center',
      textStyle: {
        color: colors.text,
        fontSize: 14,
      },
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: {
        color: colors.text,
      },
      formatter: (params: { data: { source?: string; target?: string; value?: number }; name?: string }) => {
        if (params.data.source && params.data.target) {
          const from = params.data.source.replace(SOURCE_SUFFIX, '');
          const to = params.data.target.replace(TARGET_SUFFIX, '');
          const value = params.data.value?.toLocaleString('zh-CN') || 0;
          return `${from} → ${to}: ${value}`;
        }
        return params.name?.replace(SOURCE_SUFFIX, '').replace(TARGET_SUFFIX, '') || '';
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency',
        },
        data: nodes,
        links: validLinks,
        top: '10%',
        right: '10%',
        bottom: '10%',
        left: '10%',
        nodeWidth: 20,
        nodeGap: 8,
        label: {
          fontSize: 12,
          color: colors.text,
          formatter: (params: { name: string }) => {
            return params.name.replace(SOURCE_SUFFIX, '').replace(TARGET_SUFFIX, '');
          },
        },
        lineStyle: {
          curveness: 0.5,
          opacity: 0.5,
        },
      },
    ],
  };
}

/** 渲染桑基图，返回清理函数（dispose 图表 + 断开 ResizeObserver） */
export function renderSankeyChart(
  data: SentimentTransitionAnalysis,
  container: HTMLElement,
  colors: EChartThemeColors,
): () => void {
  const chart = echarts.init(container);

  // 如果没有有效的转换数据，显示空状态（与构建完整配置区分：不挂载 resize）
  if (getValidSankeyLinks(data).length === 0) {
    chart.setOption(buildSankeyEmptyOption(colors));
    return () => {
      chart.dispose();
    };
  }

  chart.setOption(buildSankeyOption(data, colors));

  const resizeObserver = new ResizeObserver(() => {
    chart.resize();
  });
  resizeObserver.observe(container);

  return () => {
    chart.dispose();
    resizeObserver.disconnect();
  };
}
