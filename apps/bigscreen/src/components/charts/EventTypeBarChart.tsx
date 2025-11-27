import React, { useEffect, useState } from "react";
import { EChart } from "@sker/ui/components/ui/echart";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { createLogger } from '@sker/core';
import { CommonAPI } from "@/services/api";
import { useAppStore } from "@/stores/useAppStore";
import type { EChartsFormatterParams } from '@/types/charts';

interface EventTypeBarChartProps {
  height?: number;
  className?: string;
}

const logger = createLogger('EventTypeBarChart');

// 预定义的渐变色数组
const CHART_COLORS = [
  '#3b82f6', // 蓝色
  '#10b981', // 绿色
  '#f59e0b', // 橙色
  '#ef4444', // 红色
  '#8b5cf6', // 紫色
  '#ec4899', // 粉色
  '#06b6d4', // 青色
  '#84cc16', // 黄绿色
  '#f97316', // 深橙色
  '#6366f1', // 靛蓝色
];

const EventTypeBarChart: React.FC<EventTypeBarChartProps> = ({
  height = 0,
  className = "",
}) => {
  const { isDark } = useTheme();
  const { selectedTimeRange } = useAppStore();
  const [mockData, setMockData] = useState<Array<{ name: string, value: number, color?: string }>>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const data = await CommonAPI.getEventTypes(selectedTimeRange);
        if (cancelled) return;
        // 确保数据是数组格式，并只取前6条
        if (Array.isArray(data)) {
          setMockData(data);
        } else {
          logger.warn('Event types data is not an array:', data);
          setMockData([]);
        }
      } catch (error) {
        if (cancelled) return;
        logger.error('Failed to fetch event types data:', error);
        setMockData([]);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [selectedTimeRange]);

  const option = React.useMemo(() => {
    // Return null if no valid data to prevent gradient rendering errors
    if (!Array.isArray(mockData) || mockData.length === 0) {
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

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: {
          color: "#ffffff",
        },
        formatter: (params: EChartsFormatterParams[]) => {
          const data = params[0]!;
          return `${data.name}: ${data.value}`;
        },
      },
      grid: {
        left: "3%",
        right: "3%",
        top: "8%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: Array.isArray(mockData) ? mockData.map((item) => item.name) : [],
        axisLabel: {
          color: isDark ? "#f3f4f6" : "#111827",
          fontSize: 12,
          rotate: 0,
        },
        axisLine: {
          lineStyle: {
            color: isDark ? "#374151" : "#d1d5db",
          },
        },
        axisTick: {
          lineStyle: {
            color: isDark ? "#374151" : "#d1d5db",
          },
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: isDark ? "#f3f4f6" : "#111827",
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: isDark ? "#374151" : "#d1d5db",
          },
        },
        axisTick: {
          lineStyle: {
            color: isDark ? "#374151" : "#d1d5db",
          },
        },
        splitLine: {
          lineStyle: {
            color: isDark ? "#374151" : "#e5e7eb",
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "事件类型",
          type: "bar",
          data: mockData.map((item, index) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: CHART_COLORS[index % CHART_COLORS.length],
              borderRadius: [6, 6, 0, 0],
            },
          })),
          barWidth: "60%",
          label: {
            show: true,
            position: "top",
            color: isDark ? "#f3f4f6" : "#111827",
            fontSize: 12,
            fontWeight: "bold",
          },
          emphasis: {
            itemStyle: {
              opacity: 0.8,
            },
          },
          animationDelay: (idx: number) => idx * 100,
          animationDuration: 800,
          animationEasing: "elasticOut",
        },
      ],
    };
  }, [isDark, mockData]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`${className}`}
    >
      {option ? (
        <EChart
          option={option}
          opts={{ renderer: "canvas" }}
          className="w-full h-full"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          加载中...
        </div>
      )}
    </motion.div>
  );
};

export default EventTypeBarChart;
