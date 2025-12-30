import type { UserRelationNode } from '@sker/sdk';

export function getUserTypeColor(userType: string): string {
  switch (userType) {
    case 'official':
      return '#ff5555';
    case 'media':
      return '#5599ff';
    case 'kol':
      return '#dd88ff';
    case 'normal':
      return '#55dd88';
    default:
      return '#888888';
  }
}

export function getUserTypeLabel(userType: string): string {
  switch (userType) {
    case 'official':
      return '官方账号';
    case 'media':
      return '媒体账号';
    case 'kol':
      return 'KOL账号';
    case 'normal':
      return '普通用户';
    default:
      return '未知';
  }
}

export function getEdgeColor(type: string): string {
  switch (type) {
    case 'like':
      return '#ff66aa';
    case 'comment':
      return '#5599ff';
    case 'repost':
      return '#aa77ff';
    case 'comprehensive':
      return '#ffaa44';
    default:
      return '#888888';
  }
}

export function getEdgeOpacity(weight: number): number {
  const normalizedWeight = Math.min(weight / 100, 1);
  return 0.3 + normalizedWeight * 0.7;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function getNodeLabel(node: UserRelationNode): string {
  return `
    <div style="background: rgba(0,0,0,0.9); color: white; padding: 12px; border-radius: 8px; font-size: 14px;">
      <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${node.name}</div>
      <div>类型: ${getUserTypeLabel(node.userType)}</div>
      <div>粉丝: ${formatNumber(node.followers)}</div>
      <div>发帖: ${formatNumber(node.postCount)}</div>
      <div>影响力: ${node.influence}/100</div>
      ${node.verified ? '<div style="color: #2196f3;">✓ 已认证</div>' : ''}
    </div>
  `;
}