import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OpinionClusterPanel } from './OpinionClusterPanel';

describe('OpinionClusterPanel', () => {
  it('renders cluster summary, keywords, and representative posts', () => {
    render(
      <OpinionClusterPanel
        data={[
          {
            id: 'cluster-1',
            label: '批评观点',
            stance: 'critical',
            summary: '围绕追责和透明回应形成的观点簇',
            postCount: 12,
            userCount: 8,
            keywords: ['追责', '透明'],
            representativePosts: [
              {
                postId: 'post-1',
                author: '用户A',
                excerpt: '应该追责相关责任方',
                sentiment: 'negative',
                engagement: 65,
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText('批评观点')).toBeInTheDocument();
    expect(screen.getByText('围绕追责和透明回应形成的观点簇')).toBeInTheDocument();
    expect(screen.getByText('追责')).toBeInTheDocument();
    expect(screen.getByText('透明')).toBeInTheDocument();
    expect(screen.getByText('用户A')).toBeInTheDocument();
    expect(screen.getByText('应该追责相关责任方')).toBeInTheDocument();
  });
});
