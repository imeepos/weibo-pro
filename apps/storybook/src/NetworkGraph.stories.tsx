import type { Meta, StoryObj } from '@storybook/react';
import { NetworkGraph, type NetworkGraphRef } from '@sker/ui/components/ui/network-graph';
import { useRef } from 'react';
import { Button } from '@sker/ui/components/ui/button';

const meta = {
  title: 'Charts/NetworkGraph',
  component: NetworkGraph,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NetworkGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

const simpleData = {
  nodes: [
    { id: 1, label: '节点1', color: '#3b82f6', size: 20 },
    { id: 2, label: '节点2', color: '#10b981', size: 15 },
    { id: 3, label: '节点3', color: '#f59e0b', size: 15 },
  ],
  edges: [
    { id: 1, from: 1, to: 2, color: '#94a3b8' },
    { id: 2, from: 1, to: 3, color: '#94a3b8' },
  ],
};

const complexData = {
  nodes: [
    { id: 'center', label: '中心', color: { background: '#1e3a8a', border: '#1e40af' }, size: 30, shape: 'dot' },
    { id: 'hub1', label: 'Hub1', color: { background: '#1d4ed8', border: '#1e40af' }, size: 20, shape: 'dot' },
    { id: 'hub2', label: 'Hub2', color: { background: '#1d4ed8', border: '#1e40af' }, size: 20, shape: 'dot' },
    { id: 'node1', label: 'Node1', color: { background: '#2563eb', border: '#3b82f6' }, size: 15, shape: 'dot' },
    { id: 'node2', label: 'Node2', color: { background: '#2563eb', border: '#3b82f6' }, size: 15, shape: 'dot' },
    { id: 'node3', label: 'Node3', color: { background: '#3b82f6', border: '#60a5fa' }, size: 10, shape: 'dot' },
  ],
  edges: [
    { id: 1, from: 'center', to: 'hub1', color: { color: '#10b981' }, width: 2 },
    { id: 2, from: 'center', to: 'hub2', color: { color: '#10b981' }, width: 2 },
    { id: 3, from: 'hub1', to: 'node1', color: { color: '#61a5e8' } },
    { id: 4, from: 'hub1', to: 'node2', color: { color: '#61a5e8' } },
    { id: 5, from: 'hub2', to: 'node3', color: { color: '#61a5e8' } },
  ],
};

export const Basic: Story = {
  args: {
    data: simpleData,
    style: { height: '500px' },
  },
};

export const Complex: Story = {
  args: {
    data: complexData,
    style: { height: '600px' },
    options: {
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -30000,
          centralGravity: 0.3,
          springLength: 200,
        },
      },
    },
  },
};

export const WithInteraction: Story = {
  args: {
    data: null,
  },
  render: () => {
    const graphRef = useRef<NetworkGraphRef>(null);

    return (
      <div className="p-4">
        <div className="mb-4 space-x-2">
          <Button onClick={() => graphRef.current?.fit()}>适应画布</Button>
        </div>
        <NetworkGraph
          ref={graphRef}
          data={complexData}
          style={{ height: '600px' }}
          onNodeClick={(nodeId) => alert(`点击节点: ${nodeId}`)}
        />
      </div>
    );
  },
};

export const CustomOptions: Story = {
  args: {
    data: simpleData,
    style: { height: '500px' },
    options: {
      nodes: {
        shape: 'box',
        font: { color: '#ffffff' },
      },
      edges: {
        arrows: { to: { enabled: true } },
        smooth: { type: 'continuous' },
      },
      physics: {
        enabled: false,
      },
    },
  },
};
