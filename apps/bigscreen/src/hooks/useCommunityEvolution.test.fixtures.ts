import type { CommunityEvolutionAnalysis } from '@sker/sdk';

// Mock data
export const mockEvolutionData: CommunityEvolutionAnalysis = {
  timeSlices: [
    {
      timestamp: '2024-01-01T00:00:00.000Z',
      communities: [
        {
          id: 'community-0',
          name: 'Community 1',
          members: [
            {
              userId: 'user1',
              screenName: 'User One',
              role: 'leader',
              inDegree: 5,
              outDegree: 3,
            },
          ],
          size: 10,
          density: 0.8,
          avgInfluence: 0.75,
          topKeywords: ['keyword1', 'keyword2'],
          sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
        },
      ],
      modularity: 0.75,
      totalMembers: 10,
    },
    {
      timestamp: '2024-01-02T00:00:00.000Z',
      communities: [
        {
          id: 'community-0',
          name: 'Community 1',
          members: [
            {
              userId: 'user1',
              screenName: 'User One',
              role: 'leader',
              inDegree: 5,
              outDegree: 3,
            },
          ],
          size: 12,
          density: 0.85,
          avgInfluence: 0.8,
          topKeywords: ['keyword1', 'keyword2'],
          sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
        },
      ],
      modularity: 0.78,
      totalMembers: 12,
    },
  ],
  evolutionEvents: [
    {
      type: 'growth',
      timestamp: '2024-01-02T00:00:00.000Z',
      involvedCommunities: ['community-0', 'community-0'],
      magnitude: 0.2,
      description: '社区 Community 1 成长 20%',
    },
  ],
  overallStability: 0.9,
  keyChanges: [
    {
      communityId: 'community-0',
      changeType: 'growth',
      beforeSize: 10,
      afterSize: 12,
      keyMembers: ['user2'],
    },
  ],
  trendPrediction: {
    predictedCommunityCount: 3,
    predictedModularity: 0.75,
    confidence: 0.8,
  },
};

export const emptyEvolutionData: CommunityEvolutionAnalysis = {
  timeSlices: [],
  evolutionEvents: [],
  overallStability: 0,
  keyChanges: [],
  trendPrediction: {
    predictedCommunityCount: 0,
    predictedModularity: 0,
    confidence: 0,
  },
};

// Mock controller
export class MockCommunityEvolutionController {
  async getAnalysis(_eventId: string): Promise<CommunityEvolutionAnalysis> {
    return mockEvolutionData;
  }
}
