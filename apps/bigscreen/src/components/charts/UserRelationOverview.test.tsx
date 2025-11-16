import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UserRelationOverview from './UserRelationOverview';

// Mock Three.js and ForceGraph3D to avoid WebGL errors in test environment
vi.mock('react-force-graph-3d', () => ({
  default: () => <div data-testid="force-graph-3d">ForceGraph3D Mock</div>
}));

vi.mock('three', () => ({
  Scene: vi.fn(),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    domElement: document.createElement('canvas')
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn() },
    lookAt: vi.fn()
  })),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(),
  SphereGeometry: vi.fn(),
  BoxGeometry: vi.fn(),
  CylinderGeometry: vi.fn(),
  DodecahedronGeometry: vi.fn(),
  Mesh: vi.fn(),
  MeshLambertMaterial: vi.fn(() => ({
    color: { set: vi.fn() }
  })),
  MeshBasicMaterial: vi.fn(() => ({
    color: { set: vi.fn() }
  })),
  LineBasicMaterial: vi.fn(),
  BufferGeometry: vi.fn(),
  Vector3: vi.fn(),
  Line: vi.fn(),
  Points: vi.fn(),
  PointsMaterial: vi.fn(),
  BufferAttribute: vi.fn()
}));

describe('UserRelationOverview', () => {
  it('should render loading state initially', () => {
    render(<UserRelationOverview />);

    expect(screen.getByText('正在加载用户关系数据...')).toBeInTheDocument();
  });

  it('should render the component title', async () => {
    render(<UserRelationOverview />);

    // 等待组件加载完成
    await screen.findByText('用户关系网络');

    expect(screen.getByText('用户关系网络')).toBeInTheDocument();
    expect(screen.getByText('核心用户互动关系可视化')).toBeInTheDocument();
  });

  it('should render user type legends', async () => {
    render(<UserRelationOverview />);

    // 等待组件加载完成
    await screen.findByText('用户关系网络');

    expect(screen.getByText('官方账号')).toBeInTheDocument();
    expect(screen.getByText('KOL')).toBeInTheDocument();
    expect(screen.getByText('媒体')).toBeInTheDocument();
  });

  it('should render statistics in footer', async () => {
    render(<UserRelationOverview />);

    // 等待组件加载完成
    await screen.findByText('用户关系网络');

    expect(screen.getByText(/节点: \d+ \| 连接: \d+/)).toBeInTheDocument();
    expect(screen.getByText('查看详情 →')).toBeInTheDocument();
  });

  it('should handle custom height prop', () => {
    render(<UserRelationOverview height={500} />);

    const container = screen.getByText('正在加载用户关系数据...').closest('.glass-card');
    expect(container).toHaveStyle({ height: '500px' });
  });
});