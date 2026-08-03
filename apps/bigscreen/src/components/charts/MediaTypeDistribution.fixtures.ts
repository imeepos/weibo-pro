import type { MediaTypeAnalysis } from '@sker/sdk';

export const mockData: MediaTypeAnalysis = {
  distribution: [
    {
      type: 'text',
      count: 100,
      percentage: 40,
      avgEngagement: 25,
    },
    {
      type: 'image',
      count: 75,
      percentage: 30,
      avgEngagement: 35,
    },
    {
      type: 'video',
      count: 50,
      percentage: 20,
      avgEngagement: 50,
    },
    {
      type: 'link',
      count: 15,
      percentage: 6,
      avgEngagement: 20,
    },
    {
      type: 'mixed',
      count: 10,
      percentage: 4,
      avgEngagement: 45,
    },
  ],
  totalPosts: 250,
  trend: [
    {
      timestamp: '2024-01-01T10:00:00Z',
      types: {
        text: 10,
        image: 8,
        video: 5,
        link: 2,
        mixed: 1,
      },
    },
    {
      timestamp: '2024-01-01T11:00:00Z',
      types: {
        text: 15,
        image: 12,
        video: 8,
        link: 3,
        mixed: 2,
      },
    },
  ],
  engagementByType: [
    {
      type: 'text',
      avgLikes: 10,
      avgComments: 5,
      avgReposts: 2,
    },
    {
      type: 'image',
      avgLikes: 15,
      avgComments: 8,
      avgReposts: 3,
    },
    {
      type: 'video',
      avgLikes: 25,
      avgComments: 12,
      avgReposts: 5,
    },
  ],
};
