// 智能聚焦系统工具函数

export interface FocusResult {
  highlightNodes: Set<string>;
  dimmedNodes: Set<string>;
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
  cameraTarget: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * 智能聚焦算法
 */
export const smartFocusAlgorithm = (
  selectedNode: any,
  graphData: any,
  maxLevels: number = 2
): FocusResult => {
  const focusLevels: Record<number, Set<string>> = {
    1: new Set([selectedNode.id]), // 直接连接
    2: new Set(), // 二级连接
    3: new Set()  // 三级连接
  };

  // 计算连接层级
  graphData.links.forEach((link: any) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source.toString();
    const targetId = typeof link.target === 'object' ? link.target.id : link.target.toString();

    if (sourceId === selectedNode.id || targetId === selectedNode.id) {
      const neighborId = sourceId === selectedNode.id ? targetId : sourceId;
      focusLevels[1].add(neighborId);

      // 二级连接
      if (maxLevels >= 2) {
        graphData.links.forEach((link2: any) => {
          const source2Id = typeof link2.source === 'object' ? link2.source.id : link2.source.toString();
          const target2Id = typeof link2.target === 'object' ? link2.target.id : link2.target.toString();

          if ((source2Id === neighborId || target2Id === neighborId) &&
              !focusLevels[1].has(source2Id === neighborId ? target2Id : source2Id)) {
            const level2Id = source2Id === neighborId ? target2Id : source2Id;
            focusLevels[2].add(level2Id);
          }
        });
      }
    }
  });

  // 合并所有高亮节点
  const highlightNodes = new Set<string>([...focusLevels[1], ...focusLevels[2]]);

  // 计算需要暗淡的节点
  const allNodeIds = new Set<string>(graphData.nodes.map((n: any) => n.id.toString()));
  const dimmedNodes = new Set<string>([...allNodeIds].filter(id => !highlightNodes.has(id.toString())));

  // 计算最佳相机位置
  const { cameraPosition, cameraTarget } = calculateOptimalCamera(selectedNode, focusLevels, graphData);

  return {
    highlightNodes,
    dimmedNodes,
    cameraPosition,
    cameraTarget
  };
};

/**
 * 计算最佳相机位置
 */
export const calculateOptimalCamera = (
  selectedNode: any,
  focusLevels: Record<number, Set<string>>,
  graphData: any
): { cameraPosition: { x: number; y: number; z: number }; cameraTarget: { x: number; y: number; z: number } } => {
  // 计算聚焦区域的边界
  const highlightedNodes = graphData.nodes.filter((node: any) =>
    focusLevels[1].has(node.id) || focusLevels[2].has(node.id)
  );

  if (highlightedNodes.length === 0) {
    return {
      cameraPosition: { x: 300, y: 300, z: 300 },
      cameraTarget: { x: 0, y: 0, z: 0 }
    };
  }

  // 计算边界框
  const positions = highlightedNodes.map((node: any) => ({
    x: node.x || 0,
    y: node.y || 0,
    z: node.z || 0
  }));

  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));
  const minZ = Math.min(...positions.map(p => p.z));
  const maxZ = Math.max(...positions.map(p => p.z));

  // 计算中心点
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2
  };

  // 计算边界大小
  const width = maxX - minX;
  const height = maxY - minY;
  const depth = maxZ - minZ;
  const maxDimension = Math.max(width, height, depth, 100); // 最小100单位

  // 计算相机位置（在边界框外一定距离）
  const distance = maxDimension * 1.5;

  return {
    cameraPosition: {
      x: center.x + distance,
      y: center.y + distance * 0.5,
      z: center.z + distance
    },
    cameraTarget: center
  };
};

/**
 * 时间轴数据组织
 */
export interface TimeSlice {
  timestamp: string;
  nodes: any[];
  edges: any[];
  statistics: any;
}

/**
 * 创建时间轴控制器
 */
export const createTimeSlider = (timeSlices: TimeSlice[]) => {
  let currentIndex = 0;
  let isPlaying = false;
  let playbackSpeed = 1;

  return {
    getCurrentIndex: () => currentIndex,
    isPlaying: () => isPlaying,
    getPlaybackSpeed: () => playbackSpeed,

    setPlaybackSpeed: (speed: number) => {
      playbackSpeed = Math.max(0.1, Math.min(5, speed));
    },

    play: (onTimeChange: (slice: TimeSlice, index: number) => void) => {
      if (isPlaying) return;

      isPlaying = true;
      const interval = setInterval(() => {
        if (currentIndex < timeSlices.length - 1) {
          currentIndex++;
          onTimeChange(timeSlices[currentIndex], currentIndex);
        } else {
          clearInterval(interval);
          isPlaying = false;
        }
      }, 1000 / playbackSpeed);

      return () => {
        clearInterval(interval);
        isPlaying = false;
      };
    },

    pause: () => {
      isPlaying = false;
    },

    seek: (index: number, onTimeChange: (slice: TimeSlice, index: number) => void) => {
      currentIndex = Math.max(0, Math.min(timeSlices.length - 1, index));
      onTimeChange(timeSlices[currentIndex], currentIndex);
    }
  };
};

/**
 * 高级搜索建议
 */
export const searchSuggestions = (query: string, graphData: any) => {
  if (!query.trim()) return [];

  const matches = graphData.nodes.filter((node: any) =>
    node.name?.toLowerCase().includes(query.toLowerCase()) ||
    node.location?.toLowerCase().includes(query.toLowerCase())
  );

  return matches.slice(0, 10).map((node: any) => ({
    id: node.id,
    name: node.name,
    type: node.userType,
    followers: node.followers,
    influence: node.influence,
    matchType: node.name?.toLowerCase().includes(query.toLowerCase()) ? 'name' : 'location'
  }));
};