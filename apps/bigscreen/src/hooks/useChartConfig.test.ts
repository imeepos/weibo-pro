import { renderHook } from '@testing-library/react';
import { useChartTheme } from './useChartConfig';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useTheme hook
vi.mock('./useTheme', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    isDark: false,
    isLight: true,
  })),
}));

import { useTheme } from './useTheme';

describe('useChartTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getComputedStyle for CSS variables
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: vi.fn((prop: string) => {
        const cssVars: Record<string, string> = {
          '--color-card': '255 255 255',
          '--color-card-foreground': '0 0 0',
          '--color-border': '229 231 235',
        };
        return cssVars[prop] || '';
      }),
    } as unknown as CSSStyleDeclaration);
  });

  describe('sentimentColors', () => {
    it('should return correct sentiment colors for light theme', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: 'light',
        isDark: false,
        isLight: true,
        toggleTheme: vi.fn(),
        setTheme: vi.fn(),
      });

      const { result } = renderHook(() => useChartTheme());

      expect(result.current.sentimentColors).toBeDefined();
      expect(result.current.sentimentColors.positive).toBe('#10b981');
      expect(result.current.sentimentColors.negative).toBe('#ef4444');
      expect(result.current.sentimentColors.neutral).toBe('#6b7280');
    });

    it('should return correct sentiment colors for dark theme', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: 'dark',
        isDark: true,
        isLight: false,
        toggleTheme: vi.fn(),
        setTheme: vi.fn(),
      });

      const { result } = renderHook(() => useChartTheme());

      expect(result.current.sentimentColors).toBeDefined();
      expect(result.current.sentimentColors.positive).toBe('#34d399');
      expect(result.current.sentimentColors.negative).toBe('#f87171');
      expect(result.current.sentimentColors.neutral).toBe('#9ca3af');
    });
  });

  describe('tooltipStyle', () => {
    it('should return correct tooltip style for light theme', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: 'light',
        isDark: false,
        isLight: true,
        toggleTheme: vi.fn(),
        setTheme: vi.fn(),
      });

      const { result } = renderHook(() => useChartTheme());

      expect(result.current.tooltipStyle).toBeDefined();
      expect(result.current.tooltipStyle.backgroundColor).toBe('#ffffff');
      expect(result.current.tooltipStyle.textColor).toBe('#1f2937');
      expect(result.current.tooltipStyle.borderColor).toBe('#e5e7eb');
    });

    it('should return correct tooltip style for dark theme', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: 'dark',
        isDark: true,
        isLight: false,
        toggleTheme: vi.fn(),
        setTheme: vi.fn(),
      });

      const { result } = renderHook(() => useChartTheme());

      expect(result.current.tooltipStyle).toBeDefined();
      expect(result.current.tooltipStyle.backgroundColor).toBe('#1f2937');
      expect(result.current.tooltipStyle.textColor).toBe('#f3f4f6');
      expect(result.current.tooltipStyle.borderColor).toBe('#374151');
    });
  });

  describe('axisStyle', () => {
    it('should return correct axis style for light theme', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: 'light',
        isDark: false,
        isLight: true,
        toggleTheme: vi.fn(),
        setTheme: vi.fn(),
      });

      const { result } = renderHook(() => useChartTheme());

      expect(result.current.axisStyle).toBeDefined();
      expect(result.current.axisStyle.lineColor).toBe('#e5e7eb');
      expect(result.current.axisStyle.labelColor).toBe('#6b7280');
      expect(result.current.axisStyle.splitLineColor).toBe('#e5e7eb');
    });

    it('should return correct axis style for dark theme', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: 'dark',
        isDark: true,
        isLight: false,
        toggleTheme: vi.fn(),
        setTheme: vi.fn(),
      });

      const { result } = renderHook(() => useChartTheme());

      expect(result.current.axisStyle).toBeDefined();
      expect(result.current.axisStyle.lineColor).toBe('#374151');
      expect(result.current.axisStyle.labelColor).toBe('#9ca3af');
      expect(result.current.axisStyle.splitLineColor).toBe('#374151');
    });
  });

  describe('seriesColors', () => {
    it('should return engagement series colors for light theme', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: 'light',
        isDark: false,
        isLight: true,
        toggleTheme: vi.fn(),
        setTheme: vi.fn(),
      });

      const { result } = renderHook(() => useChartTheme());

      expect(result.current.seriesColors).toBeDefined();
      expect(result.current.seriesColors.comment).toBe('#3b82f6');
      expect(result.current.seriesColors.repost).toBe('#10b981');
      expect(result.current.seriesColors.like).toBe('#ec4899');
      expect(result.current.seriesColors.total).toBe('#f59e0b');
    });

    it('should return engagement series colors for dark theme', () => {
      vi.mocked(useTheme).mockReturnValue({
        theme: 'dark',
        isDark: true,
        isLight: false,
        toggleTheme: vi.fn(),
        setTheme: vi.fn(),
      });

      const { result } = renderHook(() => useChartTheme());

      expect(result.current.seriesColors).toBeDefined();
      expect(result.current.seriesColors.comment).toBe('#60a5fa');
      expect(result.current.seriesColors.repost).toBe('#34d399');
      expect(result.current.seriesColors.like).toBe('#f472b6');
      expect(result.current.seriesColors.total).toBe('#fbbf24');
    });
  });
});
