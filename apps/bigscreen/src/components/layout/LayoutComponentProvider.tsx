import React from "react";
import StatsOverview from "../ui/StatsOverview";
import SentimentTrendChart from "../charts/SentimentTrendChart";
import WordCloudChart from "../charts/WordCloudChart";
import GeographicChart from "../charts/GeographicChart";
import HotEventsList from "../charts/HotEventsList";
import { componentWrappers, WordCloudProvider } from "./LayoutComponentProvider.wrappers";
import { generateComponentData } from "./LayoutComponentProvider.data";

// 为 LayoutEditor 使用的组件映射（向后兼容）
export const legacyComponentMap: Record<string, React.ComponentType<any>> = {
  StatsOverview: () => {
    const { statsData } = generateComponentData();
    return <StatsOverview data={statsData} className="flex-1" />;
  },
  SentimentTrendChart: () => <SentimentTrendChart className="flex-1" />,
  WordCloudChart: () => {
    return (
      <WordCloudProvider maxWords={1000}>
        <WordCloudChart className="flex-1" />
      </WordCloudProvider>
    );
  },
  GeographicChart: () => <GeographicChart className="flex-1" />,
  HotEventsList: () => <HotEventsList className="flex-1" />,
};

// 渲染组件的通用函数
export const renderComponent = (componentId: string, props: any = {}) => {
  const ComponentWrapper =
    componentWrappers[componentId as keyof typeof componentWrappers];

  if (!ComponentWrapper) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div className="text-sm">组件: {componentId}</div>
          <div className="text-xs text-gray-400 mt-1">暂未配置</div>
        </div>
      </div>
    );
  }

  return <ComponentWrapper {...props} />;
};

// 支持时间范围的渲染函数
export const renderComponentWithTimeRange = (componentId: string, timeRange?: string, _props: any = {}) => {
  const ComponentWrapper =
    componentWrappers[componentId as keyof typeof componentWrappers];

  if (!ComponentWrapper) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300 rounded">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div className="text-sm">组件: {componentId}</div>
          <div className="text-xs text-gray-400 mt-1">暂未配置</div>
        </div>
      </div>
    );
  }

  // 将timeRange作为参数传递给组件包装器函数
  return ComponentWrapper(timeRange);
};

// 默认导出组件映射（用于 LayoutEditor）
export default legacyComponentMap;
