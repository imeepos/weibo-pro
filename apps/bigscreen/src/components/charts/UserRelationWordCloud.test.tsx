/**
 * UserRelationWordCloud 组件测试
 * 测试用户关系词云组件的核心功能，包括：
 * - 基础渲染
 * - 数据处理（连线数计算、排序、限制词数、颜色分配）
 * - 关系类型切换
 * - 状态管理（加载、错误、空数据）
 * - 性能优化（useMemo缓存）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { UserRelationNetwork } from '@sker/sdk';

// Mock WordCloud component
vi.mock('@sker/ui/components/ui/word-cloud', () => ({
  WordCloud: ({ data, onWordClick }: any) => (
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
  ),
}));

// Mock ChartState component
vi.mock('@sker/ui/components/ui/chart-state', () => ({
  ChartState: ({ loading, error, empty, children }: any) => {
    if (loading) return <div data-testid="loading-state">加载中...</div>;
    if (error) return <div data-testid="error-state">{error}</div>;
    if (empty) return <div data-testid="empty-state">暂无数据</div>;
    return <>{children}</>;
  },
}));

// Mock ToggleGroup component
vi.mock('@sker/ui/components/ui/toggle-group', () => ({
  ToggleGroup: ({ value, onValueChange, children }: any) => (
    <div data-testid="toggle-group" data-value={value}>
      {children}
    </div>
  ),
  ToggleGroupItem: ({ value, children, onClick }: any) => (
    <button
      data-testid={`toggle-${value}`}
      onClick={() => onClick?.(value)}
    >
      {children}
    </button>
  ),
}));

// Mock utils
vi.mock('@/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// 导入待测试组件（需要在所有 mock 之后）
