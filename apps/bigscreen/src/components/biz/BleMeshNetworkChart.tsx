import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { NetworkGraph, NetworkGraphData, ChartState, Button } from '@sker/ui';
import { BleMeshTopologyData, DeviceInfo } from '../../types/bleMesh';
import { getBleMeshTopologyData, getDeviceDetails } from '../../services/api/bleMesh';

interface BleMeshNetworkChartProps {
  type: 'reachability' | 'assignment';
  isLoading?: boolean;
  onDeviceSelect?: (device: DeviceInfo | null) => void;
  onRefresh?: () => void;
  customerId?: string;
  maxNodes?: number;
  enableVirtualization?: boolean;
}

const BleMeshNetworkChart: React.FC<BleMeshNetworkChartProps> = ({
  type,
  isLoading = false,
  onDeviceSelect,
  onRefresh,
  customerId = 'demo'
}) => {
  const [networkData, setNetworkData] = useState<NetworkGraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 简化的数据转换 - 仿Vue策略
  const convertToVisFormat = useCallback((data: BleMeshTopologyData[]) => {
    console.log('🔄 开始转换数据格式...', { dataLength: data?.length, data: data?.slice(0, 2) });
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ 数据不是数组格式:', typeof data);
      return { nodes: [], edges: [] };
    }

    if (data.length === 0) {
      console.warn('⚠️ 数据数组为空');
      return { nodes: [], edges: [] };
    }

    const nodeMap = new Map();
    const edgeMap = new Map();

    // 1. 生成节点
    data.forEach((item, index) => {
      if (index < 3) console.log(`处理数据项 ${index}:`, item);
      
      // 安全检查数据项
      if (!item || typeof item !== 'object') {
        console.warn(`数据项 ${index} 无效:`, item);
        return;
      }
      
      // 添加Source节点
      if (item.Source && typeof item.Source === 'string' && !nodeMap.has(item.Source)) {
        nodeMap.set(item.Source, {
          id: item.Source,
          label: item.Source === 'Pompeo' ? 'Pompeo' : '',
          color: item.Source === 'Pompeo' 
            ? { background: '#010E45', border: '#010E45' }
            : { background: '#1A4999', border: '#010E45' },
          size: item.Source === 'Pompeo' ? 260 : 50,
          shape: 'dot'
        });
      }

      // 添加target节点
      if (item.target && typeof item.target === 'string' && !nodeMap.has(item.target)) {
        const size = typeof item.size === 'number' && !isNaN(item.size) ? item.size * 125 : 50;
        nodeMap.set(item.target, {
          id: item.target,
          label: '',
          color: { background: '#1A4999', border: '#010E45' },
          size: Math.max(20, Math.min(200, size)),
          shape: 'dot'
        });
      }
    });

    // 2. 生成边
    data.forEach((item, index) => {
      if (!item.Source || !item.target || typeof item.Source !== 'string' || typeof item.target !== 'string') {
        if (index < 3) console.log(`跳过边生成 ${index}: Source=${item.Source}, target=${item.target}`);
        return;
      }
      
      const edgeKey = `${item.Source}-${item.target}`;
      if (edgeMap.has(edgeKey)) return;

      edgeMap.set(edgeKey, {
        id: `edge-${index}`,
        from: item.Source,
        to: item.target,
        color: { color: '#61a5e8' },
        width: 1
      });
    });

    const result = {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values())
    };
    
    console.log('✅ 数据转换完成:', {
      原始数据长度: data.length,
      节点数量: result.nodes.length,
      边数量: result.edges.length,
      节点示例: result.nodes.slice(0, 2),
      边示例: result.edges.slice(0, 2)
    });
    
    return result;
  }, []);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setError(null);
      console.log('🔄 开始加载BLE Mesh数据...', { customerId, type });
      
      const response = await getBleMeshTopologyData({
        customerId,
        type,
        refresh: true
      });

      console.log('📥 API响应:', response);

      if (response?.success && Array.isArray(response.data)) {
        console.log('📊 原始数据长度:', response.data.length);
        console.log('📊 原始数据前3项:', response.data.slice(0, 3));
        
        const visData = convertToVisFormat(response.data);
        console.log('🎯 转换后的vis数据:', visData);
        console.log('🎯 节点数量:', visData.nodes.length);
        console.log('🎯 边数量:', visData.edges.length);
        
        setNetworkData(visData);
      } else {
        throw new Error('API响应格式错误');
      }
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      setError(String(error));
      setNetworkData(null);
    }
  }, [customerId, type, convertToVisFormat]);

  const networkOptions = useMemo(() => ({
    autoResize: true,
    height: '520px',
    width: '100%',
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -40000,
        centralGravity: 0.3,
        springLength: 200,
        springConstant: 0.001,
        damping: 0.09
      }
    },
    nodes: {
      shape: 'dot',
      font: { size: 25, align: 'middle' },
      borderWidth: 1
    },
    edges: {
      width: 1,
      length: 260,
      color: { color: '#61a5e8' },
      smooth: false,
      arrows: { to: false }
    },
    interaction: {
      hover: false,
      dragNodes: false,
      dragView: false,
      zoomView: true,
      selectable: true
    }
  }), []);

  const handleNodeClick = useCallback(async (nodeId: string | number) => {
    if (!onDeviceSelect) return;
    try {
      const deviceResponse = await getDeviceDetails(nodeId);
      if (deviceResponse.success) {
        onDeviceSelect(deviceResponse.data);
      }
    } catch (error) {
      console.warn('获取设备信息失败:', error);
    }
  }, [onDeviceSelect]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
    loadData();
  }, [onRefresh, loadData]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 right-2 z-10">
        <Button
          size="icon"
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading}
          title="刷新数据"
        >
          <RefreshCw className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </div>

      <ChartState
        loading={isLoading}
        error={error || undefined}
        empty={!networkData}
        loadingText="加载网络拓扑中..."
        emptyDescription="无可用的拓扑数据"
        onRetry={handleRefresh}
      >
        <NetworkGraph
          data={networkData}
          options={networkOptions}
          onNodeClick={handleNodeClick}
          className="rounded border border-gray-200"
          style={{ height: '520px', backgroundColor: '#f8fafc' }}
        />
      </ChartState>
    </div>
  );
};

export default BleMeshNetworkChart;