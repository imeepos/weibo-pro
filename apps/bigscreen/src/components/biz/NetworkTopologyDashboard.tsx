import React, { useEffect } from 'react';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import { Legend } from '@sker/ui/components/ui/legend';
import { StatisticsCard } from '@sker/ui/components/ui/statistics-card';
import { useNetworkTopology } from './network-topology';
import type { NetworkTopologyDashboardProps } from './network-topology';

/**
 * 网络拓扑仪表盘组件
 *
 * 职责：负责对外组合与渲染
 * - 数据获取、网络实例管理、事件绑定：见 useNetworkTopology hook
 * - 数据转换纯函数：见 network-topology/transform.ts
 * - 网络配置：见 network-topology/options.ts
 * - API 调用：见 network-topology/api.ts
 */
const NetworkTopologyDashboard: React.FC<NetworkTopologyDashboardProps> = ({
  className = '',
  customerId = '',
  width = '100%',
  height = '100%',
  onNodeClick
}) => {
  const { containerRef, isLoading, error, statistics, loadData } = useNetworkTopology({
    customerId,
    onNodeClick
  });

  // 生命周期：首次挂载时加载拓扑数据（customerId 变化时重新加载）
  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ width, height }}>
      <ChartState
        loading={isLoading}
        error={error || undefined}
        loadingText="正在加载拓扑数据..."
        onRetry={() => loadData()}
      >
        {/* 网络容器 */}
        <div
          ref={containerRef}
          className="w-full"
          style={{
            height: '500px',
            minHeight: '500px',
            maxHeight: '500px',
            overflow: 'hidden'
          }}
        />

        <Legend
          title="节点类型"
          position="bottom-left"
          items={[
            { color: '#1e3a8a', label: '核心节点 (MainHub)', size: 'md', borderColor: '#1e40af' },
            { color: '#1d4ed8', label: '高重要性节点', size: 'sm', borderColor: '#1e40af' },
            { color: '#2563eb', label: '中等重要性节点 (0.15-0.3)', size: 'sm', borderColor: '#3b82f6' },
            { color: '#3b82f6', label: '普通节点', size: 'sm', borderColor: '#60a5fa' }
          ]}
        />

        {(statistics.efdTotal > 0 || statistics.appTotal > 0) && (
          <StatisticsCard
            title="统计"
            position="top-right"
            items={[
              { label: '回声设备', value: statistics.efdTotal },
              { label: '家电设备', value: statistics.appTotal },
              { label: 'IoT设备', value: statistics.iotTotal },
              { label: '云服务', value: statistics.cloudTotal }
            ]}
          />
        )}
      </ChartState>
    </div>
  );
};

export default NetworkTopologyDashboard;
