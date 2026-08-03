import React from 'react';
import { useEffect, useRef } from 'react';
import { useSentimentTransition } from '../../hooks/useSentimentTransition';
import { useEChartTheme } from '@sker/ui/hooks/use-echart-theme';
import { renderSankeyChart } from './SentimentTransition.sankey';
import { renderTimelineChart } from './SentimentTransition.timeline';
import { renderTurningPointsTimeline } from './SentimentTransition.turningPoints';
import { MetricIndicators, AnalysisMetadata } from './SentimentTransition.panels';

interface SentimentTransitionProps {
  eventId: string;
}

export const SentimentTransition: React.FC<SentimentTransitionProps> = ({ eventId }) => {
  const { data, loading, error } = useSentimentTransition(eventId);
  const sankeyRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const turningPointsRef = useRef<HTMLDivElement>(null);
  const { colors } = useEChartTheme();

  useEffect(() => {
    if (data && sankeyRef.current) {
      return renderSankeyChart(data, sankeyRef.current, colors);
    }
  }, [data, colors]);

  useEffect(() => {
    if (data && timelineRef.current) {
      return renderTimelineChart(data, timelineRef.current, colors);
    }
  }, [data, colors]);

  useEffect(() => {
    if (data && turningPointsRef.current && data.turningPoints.length > 0) {
      return renderTurningPointsTimeline(data, turningPointsRef.current, colors);
    }
  }, [data, colors]);

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground">加载中...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-destructive">错误: {error.message}</div>;
  }

  if (!data || data.timeline.length === 0) {
    return <div className="p-10 text-center text-muted-foreground">暂无数据</div>;
  }

  return (
    <div className="p-5 bg-background rounded-lg border border-border">
      <div className="mb-5">
        <h3 className="m-0 mb-2.5 text-xl font-semibold text-foreground">情感转变分析</h3>
        <MetricIndicators data={data} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="border border-border rounded-lg p-4 bg-card">
          <h4 className="m-0 mb-3 text-sm font-semibold text-foreground">转变流向桑基图</h4>
          <div ref={sankeyRef} className="w-full h-[400px]"></div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card">
          <h4 className="m-0 mb-3 text-sm font-semibold text-foreground">情感时间线</h4>
          <div ref={timelineRef} className="w-full h-[400px]"></div>
        </div>
      </div>

      {data.turningPoints.length > 0 && (
        <div className="mt-5 p-4 bg-card border border-border rounded-lg">
          <h4 className="m-0 mb-3 text-base font-semibold text-foreground">转折点时间轴</h4>
          <div ref={turningPointsRef} className="w-full h-[300px]"></div>
        </div>
      )}

      {/* 显示元数据 */}
      {data.metadata && <AnalysisMetadata metadata={data.metadata} />}
    </div>
  );
};
