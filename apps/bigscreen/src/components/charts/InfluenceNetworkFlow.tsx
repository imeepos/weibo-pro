import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes, type NetworkUser } from './InfluenceNetworkFlow.nodes';

interface InfluenceNetworkFlowProps {
  users: NetworkUser[];
  className?: string;
}

const InfluenceNetworkFlow: React.FC<InfluenceNetworkFlowProps> = ({
  users,
  className = ''
}) => {
  // 创建节点数据
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    // 中心事件节点
    nodes.push({
      id: 'center',
      type: 'centerNode',
      position: { x: 200, y: 150 },
      data: {},
      draggable: false,
    });

    // 用户节点 - 圆形布局
    users.forEach((user, index) => {
      const angle = (index * 2 * Math.PI) / users.length;
      const radius = 150;
      const x = 200 + Math.cos(angle) * radius;
      const y = 150 + Math.sin(angle) * radius;

      nodes.push({
        id: user.id,
        type: 'userNode',
        position: { x: x - 25, y: y - 25 },
        data: { user },
        draggable: true,
      });
    });

    return nodes;
  }, [users]);

  // 创建连线数据
  const initialEdges: Edge[] = useMemo(() => {
    return users.map((user, _index) => ({
      id: `center-${user.id}`,
      source: 'center',
      target: user.id,
      type: 'straight',
      animated: true,
      style: {
        strokeWidth: Math.max(4, user.influence / 20),
        stroke: '#ef4444',
        strokeOpacity: 1,
      },
      label: `${user.influence}`,
      labelStyle: {
        fontSize: 12,
        fontWeight: 'bold',
        fill: '#3b82f6',
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '2px 6px',
        borderRadius: '4px'
      },
      data: { influence: user.influence },
    }));
  }, [users]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className={`relative ${className}`}>
      {/* 确保React Flow边样式的CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .react-flow-edges-visible .react-flow__edges {
            z-index: 1 !important;
          }
          .react-flow-edges-visible .react-flow__nodes {
            z-index: 10 !important;
          }
          .react-flow-edges-visible .react-flow__node {
            z-index: 10 !important;
          }
          .react-flow-edges-visible .react-flow__edge path {
            stroke: #ef4444 !important;
            stroke-width: 3px !important;
            stroke-opacity: 1 !important;
          }
          .react-flow-edges-visible .react-flow__edge-text {
            fill: #ef4444 !important;
            font-weight: bold !important;
          }
        `
      }} />

      <div className="relative w-full bg-card/30 rounded-lg p-4 overflow-hidden" style={{ height: '500px' }}>
        <h5 className="font-medium text-foreground mb-4 text-center">影响力传播网络</h5>

        {/* React Flow 网络图 */}
        <div
          className="w-full h-96 bg-white rounded-lg border-2 border-gray-300"
          style={{
            // 确保React Flow样式不被覆盖
            '--rf-edge-stroke-default': '#ef4444',
            '--rf-edge-stroke-width-default': '3px',
            height: '100%', // 固定高度
          } as React.CSSProperties}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.5}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            proOptions={{ hideAttribution: true }}
            elementsSelectable={true}
            nodesConnectable={true}
            nodesDraggable={true}
            panOnDrag={true}
            zoomOnScroll={true}
            style={{
              background: '#f8fafc',
              width: '100%',
              height: '100%'
            }}
            className="react-flow-edges-visible"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={2}
              color="#e2e8f0"
            />
            <Controls
              showZoom={true}
              showFitView={true}
              showInteractive={false}
            />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'centerNode') return '#ef4444';
                return '#3b82f6';
              }}
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="bg-black/50 border border-white/20"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default InfluenceNetworkFlow;
