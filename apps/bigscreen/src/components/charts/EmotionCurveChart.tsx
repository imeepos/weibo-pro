import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/stores/useAppStore';
import { EChart } from '@sker/ui/components/ui/echart'
import { CommonAPI } from '@/services/api';
import { createLogger } from '@/utils';
import type { EChartsFormatterParams } from '@/types/charts';

const logger = createLogger('EmotionCurveChart');

interface EmotionCurveChartProps {
  className?: string;
}

const EmotionCurveChart: React.FC<EmotionCurveChartProps> = ({
  className = ''
}) => {
  const { isDark } = useTheme();
  const { selectedTimeRange } = useAppStore();
  const [selectedType, setSelectedType] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
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

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        console.log('[EmotionCurveChart] 🚀 开始获取数据', { selectedTimeRange });
        const data = await CommonAPI.getEmotionCurve(selectedTimeRange);
        if (cancelled) return;
        console.log('[EmotionCurveChart] ✅ 收到数据', data);
        setEmotionData(data);
      } catch (error) {
        if (cancelled) return;
        console.error('[EmotionCurveChart] ❌ 获取数据失败', error);
        logger.error('Failed to fetch emotion curve data', error);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [selectedTimeRange]);

  const { hours, positiveData, negativeData, neutralData } = emotionData;

  // 情感类型按钮配置
  const emotionTypes = [
    { key: 'all', label: '全部', color: '#3b82f6', icon: '◇' },
    { key: 'positive', label: '正面', color: '#10b981', icon: '◇' },
    { key: 'negative', label: '负面', color: '#ef4444', icon: '◇' },
    { key: 'neutral', label: '中性', color: '#6b7280', icon: '◇' }
  ] as const;

  const getSeriesData = () => {
    const series = [];

    if (selectedType === 'all' || selectedType === 'positive') {
      series.push({
        name: '正面',
        type: 'line',
        data: positiveData,
        smooth: true,
        lineStyle: {
          color: '#10b981',
          width: 3,
          shadowColor: 'rgba(16, 185, 129, 0.3)',
          shadowBlur: 10
        },
        itemStyle: {
          color: '#10b981',
          borderWidth: 2,
          borderColor: '#ffffff'
        },
        areaStyle: selectedType === 'positive' ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
            ]
          }
        } : undefined,
        symbol: 'circle',
        symbolSize: 8
      });
    }

    if (selectedType === 'all' || selectedType === 'negative') {
      series.push({
        name: '负面',
        type: 'line',
        data: negativeData,
        smooth: true,
        lineStyle: {
          color: '#ef4444',
          width: 3,
          shadowColor: 'rgba(239, 68, 68, 0.3)',
          shadowBlur: 10
        },
        itemStyle: {
          color: '#ef4444',
          borderWidth: 2,
          borderColor: '#ffffff'
        },
        areaStyle: selectedType === 'negative' ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
            ]
          }
        } : undefined,
        symbol: 'circle',
        symbolSize: 8
      });
    }

    if (selectedType === 'all' || selectedType === 'neutral') {
      series.push({
        name: '中性',
        type: 'line',
        data: neutralData,
        smooth: true,
        lineStyle: {
          color: '#6b7280',
          width: 3,
          shadowColor: 'rgba(107, 114, 128, 0.3)',
          shadowBlur: 10
        },
        itemStyle: {
          color: '#6b7280',
          borderWidth: 2,
          borderColor: '#ffffff'
        },
        areaStyle: selectedType === 'neutral' ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(107, 114, 128, 0.3)' },
              { offset: 1, color: 'rgba(107, 114, 128, 0.05)' }
            ]
          }
        } : undefined,
        symbol: 'circle',
        symbolSize: 8
      });
    }

    return series;
  };

  const option = React.useMemo(() => {
    console.log('[EmotionCurveChart] 📊 渲染判断', {
      hours_length: hours.length,
      positiveData_length: positiveData.length,
      negativeData_length: negativeData.length,
      neutralData_length: neutralData.length,
      hours,
      positiveData,
      negativeData,
      neutralData
    });

    // Return null if no valid data to prevent gradient rendering errors
    if (!hours.length || (!positiveData.length && !negativeData.length && !neutralData.length)) {
      console.log('[EmotionCurveChart] ⚠️ 显示"暂无数据"');
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: 14
          }
        }
      };
    }

    console.log('[EmotionCurveChart] ✅ 显示图表');


    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        textStyle: {
          color: '#ffffff',
        },
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: (params: EChartsFormatterParams[]) => {
          let result = `${params[0]?.name}<br/>`;
          params.forEach((param) => {
            result += `<span style="color: ${param.color};">●</span> ${param.seriesName}: ${param.value}<br/>`;
          });
          return result;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: hours,
        axisLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb'
          }
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 12
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '数量',
        nameTextStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb'
          }
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          formatter: '{value}'
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#e5e7eb',
            type: 'dashed'
          }
        }
      },
      series: getSeriesData()
    };
  }, [isDark, selectedType, positiveData, negativeData, neutralData, hours]);

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