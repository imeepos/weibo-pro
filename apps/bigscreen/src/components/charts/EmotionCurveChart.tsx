import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/stores/useAppStore';
import { EChart } from '@sker/ui/components/ui/echart'
import { CommonAPI } from '@/services/api';
import { createLogger } from '@/utils';
import { emotionTypes, buildEmotionChartOption, type EmotionType } from './EmotionCurveChart.utils';

const logger = createLogger('EmotionCurveChart');

interface EmotionCurveChartProps {
  className?: string;
}

const EmotionCurveChart: React.FC<EmotionCurveChartProps> = ({
  className = ''
}) => {
  const { isDark } = useTheme();
  const { selectedTimeRange } = useAppStore();
  const [selectedType, setSelectedType] = useState<EmotionType>('all');
  const [emotionData, setEmotionData] = useState<{
    hours: string[];
    positiveData: number[];
    negativeData: number[];
    neutralData: number[];
  }>({
    hours: [],
    positiveData: [],
    negativeData: [],
    neutralData: []
  });
  const [_isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async (isBackgroundRefresh = false) => {
      try {
        // 如果是后台刷新且已有数据，只设置 isRefreshing
        if (isBackgroundRefresh && emotionData.hours.length > 0) {
          setIsRefreshing(true);
        }

        const data = await CommonAPI.getEmotionCurve(selectedTimeRange);
        if (cancelled) return;
        setEmotionData(data);
      } catch (error) {
        if (cancelled) return;
        logger.error('Failed to fetch emotion curve data', error);
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [selectedTimeRange]);

  const { hours, positiveData, negativeData, neutralData } = emotionData;

  const option = React.useMemo(
    () => buildEmotionChartOption({
      hours,
      positiveData,
      negativeData,
      neutralData,
      selectedType,
      isDark,
    }),
    [isDark, selectedType, positiveData, negativeData, neutralData, hours]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex flex-col ${className}`}
    >
      {/* 情感类型选择按钮 */}
      <div className="flex space-x-3 mb-2 justify-center flex-shrink-0">
        {emotionTypes.map((type) => (
          <button
            key={type.key}
            onClick={() => setSelectedType(type.key)}
            className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium transition-all duration-200 ${selectedType === type.key
              ? 'opacity-100'
              : 'opacity-60 hover:opacity-80'
              }`}
            style={{
              color: type.color || '#6b7280'
            }}
          >
            <span
              className="text-sm"
              style={{
                color: type.color || '#6b7280',
                filter: selectedType === type.key ? 'none' : 'grayscale(50%)'
              }}
            >
              {type.icon}
            </span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* 图表 */}
      <div className="flex-1 min-h-0">
        {option ? (
          <EChart
            option={option}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            加载中...
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EmotionCurveChart;
