/**
 * UserRelationWordCloud 测试辅助文件 - fixture 数据
 * 集中管理组件测试所需的网络数据 fixture，
 * 供各拆分后的 UserRelationWordCloud.*.test.tsx 文件复用。
 */

import type { UserRelationNetwork } from '@sker/sdk';

// Mock 数据 - 主网络
export const mockNetwork: UserRelationNetwork = {
  nodes: [
    {
      id: '1',
      name: '用户A',
      avatar: 'avatar1.jpg',
      followers: 10000,
      influence: 85,
      postCount: 500,
      verified: true,
      userType: 'kol',
      location: '北京',
    },
    {
      id: '2',
      name: '用户B',
      avatar: 'avatar2.jpg',
      followers: 5000,
      influence: 65,
      postCount: 300,
      verified: false,
      userType: 'normal',
      location: '上海',
    },
    {
      id: '3',
      name: '用户C',
      avatar: 'avatar3.jpg',
      followers: 8000,
      influence: 75,
      postCount: 400,
      verified: true,
      userType: 'media',
      location: '广州',
    },
    {
      id: '4',
      name: '用户D',
      avatar: 'avatar4.jpg',
      followers: 3000,
      influence: 45,
      postCount: 200,
      verified: false,
      userType: 'normal',
      location: '深圳',
    },
    {
      id: '5',
      name: '用户E',
      avatar: 'avatar5.jpg',
      followers: 1000,
      influence: 25,
      postCount: 100,
      verified: false,
      userType: 'normal',
      location: '杭州',
    },
  ],
  edges: [
    {
      source: '1',
      target: '2',
      weight: 10,
      type: 'comment',
      interactions: { comments: 10 },
    },
    {
      source: '1',
      target: '3',
      weight: 15,
      type: 'like',
      interactions: { likes: 15 },
    },
    {
      source: '2',
      target: '3',
      weight: 8,
      type: 'repost',
      interactions: { reposts: 8 },
    },
    {
      source: '2',
      target: '4',
      weight: 5,
      type: 'comment',
      interactions: { comments: 5 },
    },
    {
      source: '3',
      target: '4',
      weight: 12,
      type: 'like',
      interactions: { likes: 12 },
    },
    {
      source: '3',
      target: '5',
      weight: 6,
      type: 'repost',
      interactions: { reposts: 6 },
    },
    {
      source: '4',
      target: '5',
      weight: 3,
      type: 'comment',
      interactions: { comments: 3 },
    },
  ],
  statistics: {
    totalUsers: 5,
    totalRelations: 7,
    avgDegree: 2.8,
    density: 0.35,
    communities: 2,
  },
};

// 空网络
export const emptyNetwork: UserRelationNetwork = {
  nodes: [],
  edges: [],
  statistics: {
    totalUsers: 0,
    totalRelations: 0,
    avgDegree: 0,
    density: 0,
  },
};

// 只有节点没有边的网络
export const noEdgesNetwork: UserRelationNetwork = {
  nodes: mockNetwork.nodes,
  edges: [],
  statistics: {
    totalUsers: 5,
    totalRelations: 0,
    avgDegree: 0,
    density: 0,
  },
};

// 低影响力用户（用户F，影响力10，灰色）
export const networkWithLowInfluence: UserRelationNetwork = {
  ...mockNetwork,
  nodes: [
    ...mockNetwork.nodes,
    {
      id: '6',
      name: '用户F',
      avatar: 'avatar6.jpg',
      followers: 100,
      influence: 10,
      postCount: 10,
      verified: false,
      userType: 'normal',
    },
  ],
  edges: [
    ...mockNetwork.edges,
    {
      source: '5',
      target: '6',
      weight: 1,
      type: 'comment',
      interactions: { comments: 1 },
    },
  ],
};

// 孤立节点网络（用户99 没有任何边）
export const networkWithIsolatedNode: UserRelationNetwork = {
  ...mockNetwork,
  nodes: [
    ...mockNetwork.nodes,
    {
      id: '99',
      name: '孤立用户',
      avatar: 'avatar99.jpg',
      followers: 1000,
      influence: 50,
      postCount: 100,
      verified: false,
      userType: 'normal',
    },
  ],
};

// 大数据集网络
export const largeNetwork: UserRelationNetwork = {
  nodes: Array.from({ length: 1000 }, (_, i) => ({
    id: `${i}`,
    name: `用户${i}`,
    followers: Math.floor(Math.random() * 10000),
    influence: Math.floor(Math.random() * 100),
    postCount: Math.floor(Math.random() * 1000),
    verified: Math.random() > 0.5,
    userType: 'normal' as const,
  })),
  edges: Array.from({ length: 5000 }, (_, _i) => ({
    source: `${Math.floor(Math.random() * 1000)}`,
    target: `${Math.floor(Math.random() * 1000)}`,
    weight: Math.floor(Math.random() * 10) + 1,
    type: 'comprehensive' as const,
    interactions: {},
  })),
  statistics: {
    totalUsers: 1000,
    totalRelations: 5000,
    avgDegree: 10,
    density: 0.005,
  },
};

// 自环边网络（1 -> 1）
export const selfLoopNetwork: UserRelationNetwork = {
  ...mockNetwork,
  edges: [
    ...mockNetwork.edges,
    {
      source: '1',
      target: '1',
      weight: 5,
      type: 'comment',
      interactions: { comments: 5 },
    },
  ],
};

// 重复边网络（重复 1 -> 2）
export const duplicateEdgesNetwork: UserRelationNetwork = {
  ...mockNetwork,
  edges: [
    ...mockNetwork.edges,
    {
      source: '1',
      target: '2',
      weight: 5,
      type: 'comment',
      interactions: { comments: 5 },
    },
  ],
};

// 修改后的网络（新增 1 -> 4 边）
export const modifiedNetwork: UserRelationNetwork = {
  ...mockNetwork,
  edges: [
    ...mockNetwork.edges,
    {
      source: '1',
      target: '4',
      weight: 5,
      type: 'comment',
      interactions: { comments: 5 },
    },
  ],
};
