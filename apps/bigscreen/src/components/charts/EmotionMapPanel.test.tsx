import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmotionMapPanel } from './EmotionMapPanel';

describe('EmotionMapPanel', () => {
  it('renders emotion labels and weights', () => {
    render(<EmotionMapPanel data={[{ label: '愤怒', weight: 4 }, { label: '担忧', weight: 2 }]} />);

    expect(screen.getByText(/愤怒/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
    expect(screen.getByText(/担忧/)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<EmotionMapPanel data={[]} />);

    expect(screen.getByText('暂无情绪地图数据')).toBeInTheDocument();
  });
});
