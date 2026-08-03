export interface GraphNode {
  id: string;
}

export interface GraphEdge {
  source: string | { id: string };
  target: string | { id: string };
  weight?: number;
}

export interface Community {
  id: number;
  nodes: Set<string>;
  color: string;
  size: number;
  density: number;
  centrality: number;
}

export interface InterCommunityRelation {
  sourceCommunity: number;
  targetCommunity: number;
  weight: number;
  edgeCount: number;
}

export const COMMUNITY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

export const normalizeId = (id: string | { id: string }): string =>
  typeof id === 'object' ? id.id : id;

export const shuffleArray = <T>(array: T[]): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};
