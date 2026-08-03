import * as THREE from 'three';
import type { UserProfile } from '@/types';
import type {
  GraphNode,
  GraphLink,
  GraphData,
} from '@sker/ui/components/ui/force-graph-3d';

export interface UserNode extends GraphNode {
  val: number;
  riskLevel: string;
  username: string;
  nickname: string;
  followers: number;
}

export const RISK_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#10b981',
};

export const RISK_LEVELS = ['high', 'medium', 'low'];

export interface GraphConfig {
  nodeSize: number;
  linkDistance: number;
  chargeStrength: number;
  showLabels: boolean;
  autoRotate: boolean;
}

export const RISK_LABELS: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export function riskLabel(level: string): string {
  return RISK_LABELS[level] ?? '低风险';
}

export function calculateUserSimilarity(
  user1: UserProfile,
  user2: UserProfile
): number {
  let score = 0;
  let factors = 0;

  if (user1.riskLevel === user2.riskLevel) {
    score += 0.4;
  }
  factors++;

  const locationMatch = user1.location && user2.location && user1.location === user2.location;
  if (locationMatch) {
    score += 0.3;
  }
  factors++;

  const tagOverlap =
    user1.tags.filter(tag => user2.tags.includes(tag)).length /
    Math.max(user1.tags.length, user2.tags.length, 1);
  score += tagOverlap * 0.3;
  factors++;

  const followersDiff =
    Math.abs(user1.followers - user2.followers) /
    (user1.followers + user2.followers + 1);
  score += (1 - followersDiff) * 0.2;
  factors++;

  return score / factors;
}

const SIMILARITY_THRESHOLD = 0.3;

export function buildUserNode(user: UserProfile, nodeSize: number): UserNode {
  return {
    id: user.id,
    val: Math.log10(user.followers + 1) * nodeSize,
    riskLevel: user.riskLevel,
    username: user.username,
    nickname: user.nickname,
    followers: user.followers,
    color: RISK_COLORS[user.riskLevel] || '#888888',
  };
}

export function buildGraphData(
  users: UserProfile[],
  nodeSize: number
): GraphData {
  const nodes: UserNode[] = users.map(user => buildUserNode(user, nodeSize));

  const links: GraphLink[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const similarity = calculateUserSimilarity(users[i], users[j]);
      if (similarity > SIMILARITY_THRESHOLD) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          value: similarity,
        });
      }
    }
  }

  return { nodes, links };
}

export function buildNodeLabel(userNode: UserNode, showLabels: boolean): string {
  if (!showLabels) return '';
  return `
    <div style="
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      border-left: 3px solid ${RISK_COLORS[userNode.riskLevel]};
    ">
      <div style="font-weight: 600; margin-bottom: 4px;">${userNode.nickname}</div>
      <div style="font-size: 11px; opacity: 0.8;">@${userNode.username}</div>
      <div style="font-size: 11px; margin-top: 4px;">
        风险: ${riskLabel(userNode.riskLevel)}
      </div>
    </div>
  `;
}

export function createLinkMaterial(link: GraphLink): THREE.Material {
  return new THREE.MeshBasicMaterial({
    color: 0x888888,
    transparent: true,
    opacity: Math.min(link.value || 0, 0.5),
  });
}
