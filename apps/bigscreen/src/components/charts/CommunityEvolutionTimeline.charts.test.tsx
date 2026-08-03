/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CommunityEvolutionTimeline } from './CommunityEvolutionTimeline';
import { mockEvolutionData, dataWithDeathEvent } from './CommunityEvolutionTimeline.fixtures';

describe('CommunityEvolutionTimeline 外观与图表', () => {
  describe('事件类型颜色编码', () => {
    it('birth 事件应该显示为绿色', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const birthEvent = document.querySelector('[data-event-type="birth"]');
      expect(birthEvent).toBeInTheDocument();
      expect(birthEvent?.getAttribute('data-event-color')).toBe('green');
    });

    it('death 事件应该显示为红色', () => {
      render(<CommunityEvolutionTimeline data={dataWithDeathEvent} />);

      const deathEvent = document.querySelector('[data-event-type="death"]');
      expect(deathEvent).toBeInTheDocument();
      expect(deathEvent?.getAttribute('data-event-color')).toBe('red');
    });

    it('growth 事件应该显示为蓝色', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const growthEvent = document.querySelector('[data-event-type="growth"]');
      expect(growthEvent).toBeInTheDocument();
      expect(growthEvent?.getAttribute('data-event-color')).toBe('blue');
    });
  });

  describe('图表渲染', () => {
    it('应该显示社区数量变化图表', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const chartContainer = document.querySelector('[data-testid="community-count-chart"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('应该显示模块度变化图表', () => {
      render(<CommunityEvolutionTimeline data={mockEvolutionData} />);

      const chartContainer = document.querySelector('[data-testid="modularity-chart"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});
