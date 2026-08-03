/**
 * vis-network 拓扑图配置项
 */
export const networkOptions = {
  autoResize: false,
  groups: {
    useDefaultGroups: true,
    myGroupId: {},
    ws: {
      shape: 'dot',
      color: 'white'
    }
  },
  nodes: {
    shape: 'square',
    widthConstraint: 80,
    font: {
      size: 25,
      align: 'middle' as const
    },
    color: {
      border: '#010E45',
      background: '#010E45',
      highlight: {
        border: '#010E45',
        background: '#010E45'
      },
      hover: {
        border: '#010E45',
        background: '#010E45'
      }
    },
    borderWidth: 1,
    borderWidthSelected: 1
  },
  edges: {
    width: 1,
    length: 260,
    color: {
      color: '#61a5e8',
      highlight: '#848484',
      hover: '#848484',
      inherit: 'from' as const,
      opacity: 1.0
    },
    shadow: false,
    smooth: false,
    arrows: { to: false }
  },
  physics: {
    enabled: true,
    barnesHut: {
      gravitationalConstant: -40000,
      centralGravity: 0.3,
      springLength: 200,
      springConstant: 0.001,
      damping: 0.09,
      avoidOverlap: 0
    },
    stabilization: {
      enabled: true,
      iterations: 1000,
      updateInterval: 25
    },
    adaptiveTimestep: true
  },
  layout: {
    improvedLayout: false, // 禁用 improvedLayout 以提升性能
    randomSeed: 2
  },
  interaction: {
    hover: false,
    dragNodes: false,
    dragView: false,
    multiselect: true,
    selectable: true,
    selectConnectedEdges: true,
    hoverConnectedEdges: true,
    zoomView: true
  },
  manipulation: {
    enabled: false,
    addNode: true,
    addEdge: true,
    editEdge: true,
    deleteNode: true,
    deleteEdge: true
  }
};
