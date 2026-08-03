/**
 * UserRelationWordCloud 测试辅助文件 - 模块 Mock 实现
 * 集中管理组件测试所需的第三方模块 Mock 组件，
 * 供各拆分后的 UserRelationWordCloud.*.test.tsx 文件复用。
 *
 * 注意：vitest 的 vi.mock 只在测试文件中生效（hoisting 机制），
 * 因此各测试文件负责声明 vi.mock 调用，此处导出可供复用的 Mock 实现。
 */

import { Children, cloneElement, isValidElement } from 'react';

// Mock WordCloud 组件实现
export const MockWordCloud = ({ data, onWordClick }: any) => (
  <div data-testid="word-cloud">
    {data.map((item: any) => (
      <div
        key={item.name}
        data-testid={`word-${item.name}`}
        data-value={item.value}
        data-color={item.color}
        onClick={() => onWordClick?.(item)}
      >
        {item.name}: {item.value}
      </div>
    ))}
  </div>
);

// Mock ChartState 组件实现
export const MockChartState = ({ loading, error, empty, children }: any) => {
  if (loading) return <div data-testid="loading-state">加载中...</div>;
  if (error) return <div data-testid="error-state">{error}</div>;
  if (empty) return <div data-testid="empty-state">暂无数据</div>;
  return <>{children}</>;
};

// Mock ToggleGroup 组件实现
export const MockToggleGroup = ({ value, onValueChange, children }: any) => {
  // Clone children and inject onClick handler
  const childrenWithProps = Children.map(children, (child: any) => {
    if (isValidElement(child)) {
      return cloneElement(child as any, { onValueChange });
    }
    return child;
  });
  return (
    <div data-testid="toggle-group" data-value={value}>
      {childrenWithProps}
    </div>
  );
};

// Mock ToggleGroupItem 组件实现
export const MockToggleGroupItem = ({ value, children, onValueChange }: any) => (
  <button
    data-testid={`toggle-${value}`}
    onClick={() => onValueChange?.(value)}
  >
    {children}
  </button>
);

// Mock utils 的 cn 实现
export const mockCn = (...args: string[]) => args.filter(Boolean).join(' ');
