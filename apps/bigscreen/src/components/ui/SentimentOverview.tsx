import React, { useState } from 'react';
import { cn } from '@/utils';

interface SentimentData {
  positive: number;
  negative: number;
  neutral: number;
}

interface SentimentOverviewProps {
  data: SentimentData | null;
  loading?: boolean;
  className?: string;
}

const SentimentOverview: React.FC<SentimentOverviewProps> = ({
  data,
  loading = false,
  className = ''
}) => {
  // 悬浮状态
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // 获取主题色值
  const getThemeColor = (varName: string) => {
    if (typeof window === 'undefined') return '';
    const rgb = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return rgb ? `rgb(${rgb})` : '';
  };

  const positiveColor = getThemeColor('--sentiment-positive-primary');
  const negativeColor = getThemeColor('--sentiment-negative-primary');
  const neutralColor = getThemeColor('--sentiment-neutral-primary');

  // 检查数据有效性
  if (!data || typeof data.positive !== 'number' || typeof data.negative !== 'number' || typeof data.neutral !== 'number') {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        <div className="text-center text-muted-foreground">暂无数据</div>
      </div>
    );
  }

  // 计算百分比
  const total = data.positive + data.negative + data.neutral;
  const positivePercent = total > 0 ? Math.round((data.positive / total) * 100) : 0;
  const negativePercent = total > 0 ? Math.round((data.negative / total) * 100) : 0;
  const neutralPercent = total > 0 ? Math.round((data.neutral / total) * 100) : 0;

  // 计算角度
  const positiveAngle = positivePercent * 3.6;
  const negativeAngle = negativePercent * 3.6;
  // const neutralAngle = neutralPercent * 3.6; // Commented out unused variable

  // 计算鼠标悬浮的扇形
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    // 计算角度 (从12点方向开始，顺时针)
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    
    // 判断在哪个扇形
    if (angle <= positiveAngle) {
      setHoveredSegment('positive');
    } else if (angle <= positiveAngle + negativeAngle) {
      setHoveredSegment('negative');
    } else {
      setHoveredSegment('neutral');
    }
  };

  const SentimentItem = ({
    label,
    value,
    color,
    segmentType
  }: {
    label: string;
    value: number;
    color: string;
    segmentType: string;
  }) => {
    // 获取对应的背景色
    const getHoverBgColor = () => {
      if (segmentType === 'positive') return 'hover:bg-sentiment-positive/10';
      if (segmentType === 'negative') return 'hover:bg-sentiment-negative/10';
      if (segmentType === 'neutral') return 'hover:bg-sentiment-neutral/10';
      return '';
    };

    return (
      <div
        className={cn(
          "flex flex-col space-y-1 cursor-pointer rounded p-2 transition-all duration-200 hover:scale-105",
          getHoverBgColor()
        )}
        onMouseEnter={() => setHoveredSegment(segmentType)}
        onMouseLeave={() => setHoveredSegment(null)}
      >
        <div className="flex items-center justify-between">
          <span className={cn('text-xs font-medium', color)}>{label}</span>
        </div>
        <div className={cn('text-lg font-bold', color)}>
          {value}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn('p-4 space-y-4', className)}>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 bg-muted rounded w-12"></div>
              <div className="h-6 bg-muted rounded w-8"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>
        <div className="w-32 h-32 bg-muted rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* 顶部三个指标 */}
      <div className="grid grid-cols-3 gap-4">
        <SentimentItem
          key="positive"
          label="正面情绪"
          value={data.positive}
          color="text-sentiment-positive"
          segmentType="positive"
        />
        <SentimentItem
          key="negative"
          label="负面情绪"
          value={data.negative}
          color="text-sentiment-negative"
          segmentType="negative"
        />
        <SentimentItem
          key="neutral"
          label="中性情绪"
          value={data.neutral}
          color="text-sentiment-neutral"
          segmentType="neutral"
        />
      </div>

      {/* 饼图区域 */}
      <div className="flex items-center justify-between">
        {/* 左侧：环状图和百分比 */}
        <div className="flex items-center space-x-3">
          {/* 环状图 */}
          <div className="w-28 h-28 relative flex-shrink-0">
            <div 
              className={cn(
                "w-full h-full rounded-full cursor-pointer transition-all duration-300",
                hoveredSegment ? 'scale-110' : 'scale-100'
              )}
              style={{
                background: `conic-gradient(
                  ${hoveredSegment === 'positive' ? positiveColor : hoveredSegment ? positiveColor + '80' : positiveColor} 0deg ${positiveAngle}deg,
                  ${hoveredSegment === 'negative' ? negativeColor : hoveredSegment ? negativeColor + '80' : negativeColor} ${positiveAngle}deg ${positiveAngle + negativeAngle}deg,
                  ${hoveredSegment === 'neutral' ? neutralColor : hoveredSegment ? neutralColor + '80' : neutralColor} ${positiveAngle + negativeAngle}deg 360deg
                )`
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              {/* 中心空白 */}
              <div className="absolute inset-6 bg-background rounded-full pointer-events-none"></div>
              
              {/* 中心百分比显示 */}
              {hoveredSegment && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-card rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                    <span className={cn(
                      "text-sm font-bold",
                      hoveredSegment === 'positive' && 'text-sentiment-positive',
                      hoveredSegment === 'negative' && 'text-sentiment-negative',
                      hoveredSegment === 'neutral' && 'text-sentiment-neutral'
                    )}>
                      {hoveredSegment === 'positive' && `${positivePercent}%`}
                      {hoveredSegment === 'negative' && `${negativePercent}%`}
                      {hoveredSegment === 'neutral' && `${neutralPercent}%`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 百分比 */}
          <div className="space-y-1 text-xs">
            <div
              className="flex items-center space-x-2 cursor-pointer hover:bg-sentiment-positive/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
              onMouseEnter={() => setHoveredSegment('positive')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="w-2 h-2 bg-sentiment-positive rounded-full"></div>
              <span className="text-sentiment-positive font-medium">{positivePercent}%</span>
            </div>
            <div
              className="flex items-center space-x-2 cursor-pointer hover:bg-sentiment-negative/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
              onMouseEnter={() => setHoveredSegment('negative')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="w-2 h-2 bg-sentiment-negative rounded-full"></div>
              <span className="text-sentiment-negative font-medium">{negativePercent}%</span>
            </div>
            <div
              className="flex items-center space-x-2 cursor-pointer hover:bg-sentiment-neutral/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
              onMouseEnter={() => setHoveredSegment('neutral')}
              onMouseLeave={() => setHoveredSegment(null)}
            >
              <div className="w-2 h-2 bg-sentiment-neutral rounded-full"></div>
              <span className="text-sentiment-neutral font-medium">{neutralPercent}%</span>
            </div>
          </div>
        </div>

        {/* 右侧：文字标签 */}
        <div className="space-y-1 text-[10px] text-muted-foreground">
          <div
            className="flex items-center space-x-1 cursor-pointer hover:bg-sentiment-positive/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
            onMouseEnter={() => setHoveredSegment('positive')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-2 h-2 bg-sentiment-positive rounded-sm"></div>
            <span>正面</span>
          </div>
          <div
            className="flex items-center space-x-1 cursor-pointer hover:bg-sentiment-negative/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
            onMouseEnter={() => setHoveredSegment('negative')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-2 h-2 bg-sentiment-negative rounded-sm"></div>
            <span>负面</span>
          </div>
          <div
            className="flex items-center space-x-1 cursor-pointer hover:bg-sentiment-neutral/10 rounded px-1 py-0.5 transition-all duration-200 hover:scale-105"
            onMouseEnter={() => setHoveredSegment('neutral')}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="w-2 h-2 bg-sentiment-neutral rounded-sm"></div>
            <span>中性</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentOverview;