import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomLayoutEditor } from './CustomLayoutEditor';
import type { LayoutArea } from '../../stores/useLayoutStore';

// WordCloud 组件依赖 echarts-wordcloud，在 jsdom 环境无法初始化，需要 mock
vi.mock('@sker/ui/components/ui/word-cloud', () => ({
  WordCloud: () => <div data-testid="word-cloud" />,
  WordCloudRef: {},
  WordCloudItem: {},
}));

const makeArea = (overrides: Partial<LayoutArea> = {}): LayoutArea => ({
  id: 'a1',
  title: '区域 1',
  name: '测试区域',
  x: 0,
  y: 0,
  w: 4,
  h: 2,
  component: null,
  type: 'widget',
  placeholder: '点击选择组件',
  ...overrides
});

describe('CustomLayoutEditor', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders toolbar, hints and empty state', () => {
    render(<CustomLayoutEditor />);
    expect(screen.getByText('自定义布局编辑器')).toBeInTheDocument();
    expect(screen.getByText('拖拽创建区域，设计你的专属布局')).toBeInTheDocument();
    expect(screen.getByText('在网格上拖拽创建新区域')).toBeInTheDocument();
    expect(screen.getByText('开始创建你的布局')).toBeInTheDocument();
  });

  it('renders initial areas and disables undo/redo initially', () => {
    render(<CustomLayoutEditor initialAreas={[makeArea()]} />);
    expect(screen.getByText('测试区域')).toBeInTheDocument();
    expect(screen.getByTitle('撤销')).toBeDisabled();
    expect(screen.getByTitle('重做')).toBeDisabled();
  });

  it('creates a new area by dragging on the grid and supports undo', () => {
    const rectMock = {
      x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 600, width: 200, height: 600,
      toJSON: () => ({})
    } as DOMRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rectMock);

    const { container } = render(<CustomLayoutEditor />);
    const grid = container.querySelector('.relative') as HTMLElement;
    expect(grid).toBeTruthy();

    fireEvent.mouseDown(grid, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
    fireEvent.mouseUp(document);

    expect(screen.getByText('区域 1')).toBeInTheDocument();
    expect(screen.getByTitle('撤销')).toBeEnabled();

    fireEvent.click(screen.getByTitle('撤销'));
    expect(screen.queryByText('区域 1')).not.toBeInTheDocument();
    expect(screen.getByText('开始创建你的布局')).toBeInTheDocument();
  });

  it('calls onSave with current areas and config', () => {
    const initialAreas = [makeArea()];
    const onSave = vi.fn();
    render(<CustomLayoutEditor initialAreas={initialAreas} onSave={onSave} />);
    fireEvent.click(screen.getByText('保存布局'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(initialAreas, {
      cols: 12,
      name: '自定义布局',
      description: '用户自定义创建的布局'
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<CustomLayoutEditor onCancel={onCancel} />);
    fireEvent.click(screen.getByText('取消'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('opens settings modal and edits layout name', () => {
    render(<CustomLayoutEditor />);
    fireEvent.click(screen.getByTitle('布局设置'));
    const nameInput = screen.getByDisplayValue('自定义布局') as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    fireEvent.change(nameInput, { target: { value: '新布局名' } });
    expect(nameInput.value).toBe('新布局名');
  });
});
