import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PostingTimeHeatmap from './PostingTimeHeatmap';
import type { PostingTimeHeatmap as PostingTimeHeatmapType } from '@sker/sdk';
import * as echarts from 'echarts';

const mockChartInstance = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('echarts', () => ({
  init: vi.fn(() => mockChartInstance),
  default: {
    init: vi.fn(() => mockChartInstance),
  },
}));

vi.mock('@sker/ui/hooks/use-echart-theme', () => ({
  useEChartTheme: () => ({
    isDark: false,
    colors: {
      text: '#111827',
      textMuted: '#6b7280',
      border: 'rgba(0,0,0,0.2)',
      splitLine: 'rgba(0,0,0,0.08)',
      tooltipBg: 'rgba(255,255,255,0.95)',
      tooltipBorder: 'rgba(0,0,0,0.1)',
    },
  }),
}));

const mockHeatmapData: PostingTimeHeatmapType = {
  hourlyDistribution: [10, 5, 3, 2, 1, 2, 5, 15, 30, 45, 60, 55, 50, 48, 52, 65, 70, 68, 55, 40, 30, 25, 20, 15],
  weekdayDistribution: [100, 150, 200, 180, 220, 250, 120],
  heatmapMatrix: [
    [0.1, 0.05, 0.03, 0.02, 0.01, 0.02, 0.05, 0.15, 0.3, 0.45, 0.6, 0.55, 0.5, 0.48, 0.52, 0.65, 0.7, 0.68, 0.55, 0.4, 0.3, 0.25, 0.2, 0.15],
    [0.15, 0.08, 0.05, 0.03, 0.02, 0.03, 0.08, 0.2, 0.35, 0.5, 0.65, 0.6, 0.55, 0.53, 0.57, 0.7, 0.75, 0.73, 0.6, 0.45, 0.35, 0.3, 0.25, 0.2],
    [0.2, 0.1, 0.08, 0.05, 0.03, 0.05, 0.1, 0.25, 0.4, 0.55, 0.7, 0.65, 0.6, 0.58, 0.62, 0.75, 0.8, 0.78, 0.65, 0.5, 0.4, 0.35, 0.3, 0.25],
    [0.18, 0.12, 0.1, 0.08, 0.05, 0.08, 0.12, 0.3, 0.45, 0.6, 0.75, 0.7, 0.65, 0.63, 0.67, 0.8, 0.85, 0.83, 0.7, 0.55, 0.45, 0.4, 0.35, 0.3],
    [0.22, 0.15, 0.12, 0.1, 0.08, 0.1, 0.15, 0.35, 0.5, 0.65, 0.8, 0.75, 0.7, 0.68, 0.72, 0.85, 0.9, 0.88, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35],
    [0.25, 0.18, 0.15, 0.12, 0.1, 0.12, 0.18, 0.4, 0.55, 0.7, 0.85, 0.8, 0.75, 0.73, 0.77, 0.9, 0.95, 0.93, 0.8, 0.65, 0.55, 0.5, 0.45, 0.4],
    [0.12, 0.06, 0.04, 0.03, 0.02, 0.03, 0.06, 0.12, 0.2, 0.3, 0.4, 0.35, 0.3, 0.28, 0.32, 0.4, 0.45, 0.43, 0.3, 0.2, 0.15, 0.12, 0.1, 0.08],
  ],
  peakTime: {
    hour: 17,
    weekday: 5,
    count: 95,
    label: '周五 17:00',
  },
  offPeakTime: {
    hour: 4,
    weekday: 0,
    count: 1,
    label: '周日 04:00',
  },
  totalPosts: 1400,
  insights: [
    '周五17:00是发帖高峰时段',
    '工作日发帖量明显高于周末',
    '凌晨4点发帖量最低',
  ],
};

describe('PostingTimeHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染当前标题和热点时间段列表', () => {
    render(<PostingTimeHeatmap data={mockHeatmapData} />);

    expect(screen.getByText('发帖时间热力图')).toBeInTheDocument();
    expect(screen.getByText('周五 16:00')).toBeInTheDocument();
    expect(screen.getByText('周五 17:00')).toBeInTheDocument();
    expect(screen.getByText('周二 16:00')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('初始化 ECharts 并设置 heatmap 配置', async () => {
    render(<PostingTimeHeatmap data={mockHeatmapData} />);

    expect(echarts.init).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mockChartInstance.setOption).toHaveBeenCalled();
    });

    const option = mockChartInstance.setOption.mock.calls[0][0];
    expect(option.series[0].type).toBe('heatmap');
    expect(option.xAxis.data).toHaveLength(24);
    expect(option.yAxis.data).toHaveLength(7);
  });

  it('支持图表点击事件透传', async () => {
    const onClick = vi.fn();
    render(<PostingTimeHeatmap data={mockHeatmapData} onClick={onClick} />);

    await waitFor(() => {
      expect(mockChartInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    const clickHandler = mockChartInstance.on.mock.calls.find(
      (call: any[]) => call[0] === 'click',
    )?.[1];

    clickHandler({ data: [17, 5, 0.95] });

    expect(onClick).toHaveBeenCalledWith({
      hour: 17,
      weekday: 5,
      value: 0.95,
    });
  });

  it('点击左侧热点时间段列表也会透传事件', () => {
    const onClick = vi.fn();
    render(<PostingTimeHeatmap data={mockHeatmapData} onClick={onClick} />);

    fireEvent.click(screen.getByText('周五 16:00'));

    expect(onClick).toHaveBeenCalledWith({
      hour: 16,
      weekday: 5,
      value: 0.95,
    });
  });

  it('在加载、错误、空状态下不初始化图表', () => {
    const { rerender } = render(<PostingTimeHeatmap data={null} isLoading={true} />);
    expect(screen.getByText(/加载中/)).toBeInTheDocument();
    expect(echarts.init).not.toHaveBeenCalled();

    rerender(<PostingTimeHeatmap data={null} error={new Error('API Error')} />);
    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(echarts.init).not.toHaveBeenCalled();

    rerender(
      <PostingTimeHeatmap
        data={{
          hourlyDistribution: new Array(24).fill(0),
          weekdayDistribution: new Array(7).fill(0),
          heatmapMatrix: Array.from({ length: 7 }, () => new Array(24).fill(0)),
          peakTime: { hour: 0, weekday: 0, count: 0, label: '无数据' },
          offPeakTime: { hour: 0, weekday: 0, count: 0, label: '无数据' },
          totalPosts: 0,
          insights: [],
        }}
      />,
    );
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(echarts.init).not.toHaveBeenCalled();
  });

  it('支持自定义标题、高度和 className', () => {
    const { container } = render(
      <PostingTimeHeatmap
        data={mockHeatmapData}
        title="自定义热力图"
        height={600}
        className="custom-heatmap"
      />,
    );

    expect(screen.getByText('自定义热力图')).toBeInTheDocument();

    const root = container.querySelector('.custom-heatmap');
    expect(root).toBeInTheDocument();
    expect(root).toHaveStyle({ height: '600px' });
  });

  it('响应窗口 resize 并在卸载时释放图表', async () => {
    const { unmount } = render(<PostingTimeHeatmap data={mockHeatmapData} />);

    await waitFor(() => {
      expect(mockChartInstance.setOption).toHaveBeenCalled();
    });

    window.dispatchEvent(new Event('resize'));
    expect(mockChartInstance.resize).toHaveBeenCalled();

    unmount();
    expect(mockChartInstance.dispose).toHaveBeenCalled();
  });
});
