// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { AuiProvider, useAui, useAuiNode, useAuiContext, useAuiNaturalContext } from './react';
import { AuiStore } from './store';
import { AuiContextSerializer } from './serializer';

class Boundary extends React.Component<{ children: React.ReactNode }, { message: string }> {
  state = { message: '' };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (this.state.message) {
      return <div data-testid="caught">{this.state.message}</div>;
    }
    return this.props.children;
  }
}

function Probe() {
  const { store, serializer } = useAui();
  const storeOk = store instanceof AuiStore;
  const serializerOk = serializer instanceof AuiContextSerializer;
  return (
    <div data-testid="probe">
      {storeOk ? 'store' : 'no'}::{serializerOk ? 'serializer' : 'no'}
    </div>
  );
}

function NodeProbe(props: { id: string }) {
  useAuiNode(props.id, 'Button', { label: '提交' }, { importance: 'high' });
  return <div data-testid="node">node</div>;
}

function ContextProbe() {
  const ctx = useAuiContext({ page: 'home' });
  return <div data-testid="ctx">{ctx}</div>;
}

function NaturalProbe() {
  const ctx = useAuiNaturalContext('首页');
  return <div data-testid="natural">{ctx}</div>;
}

describe('react hooks', () => {
  beforeEach(() => {
    cleanup();
  });

  it('useAui 在 AuiProvider 外抛出错误', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <Boundary>
          <Probe />
        </Boundary>
      );
      expect(screen.getByTestId('caught').textContent).toBe(
        'useAui must be used within AuiProvider'
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('AuiProvider 提供默认 store 与 serializer', () => {
    render(
      <AuiProvider>
        <Probe />
      </AuiProvider>
    );
    expect(screen.getByTestId('probe').textContent).toBe('store::serializer');
  });

  it('useAuiNode 注册节点并在卸载时注销', () => {
    const store = new AuiStore();
    const { unmount } = render(
      <AuiProvider store={store}>
        <NodeProbe id="btn" />
      </AuiProvider>
    );
    expect(store.getNode('btn')).toEqual({
      id: 'btn',
      type: 'Button',
      props: { label: '提交' },
      metadata: { importance: 'high' },
    });
    unmount();
    expect(store.getNode('btn')).toBeUndefined();
  });

  it('useAuiContext 返回序列化的上下文 JSON', () => {
    const store = new AuiStore();
    store.registerNode({ id: 'a', type: 'Button' });
    render(
      <AuiProvider store={store}>
        <ContextProbe />
      </AuiProvider>
    );
    const text = screen.getByTestId('ctx').textContent;
    expect(text).toBeTruthy();
    const parsed = JSON.parse(text!) as { nodes: unknown[]; metadata: unknown; timestamp: number };
    expect(parsed.nodes).toEqual([{ id: 'a', type: 'Button' }]);
    expect(parsed.metadata).toEqual({ page: 'home' });
    expect(typeof parsed.timestamp).toBe('number');
  });

  it('useAuiNaturalContext 返回自然语言描述', () => {
    const store = new AuiStore();
    store.registerNode({ id: 'a', type: 'Button', props: { label: '提交' } });
    render(
      <AuiProvider store={store}>
        <NaturalProbe />
      </AuiProvider>
    );
    const text = screen.getByTestId('natural').textContent!;
    expect(text).toContain('# 首页');
    expect(text).toContain('按钮 "提交"');
  });
});
