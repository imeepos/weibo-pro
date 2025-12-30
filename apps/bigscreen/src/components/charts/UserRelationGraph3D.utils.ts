import type { UserRelationNode } from '@sker/sdk';

export function getUserTypeColor(userType: string): string {
  switch (userType) {
    case 'official':
      return '#ff6b6b'; // 现代红色 - 官方权威
    case 'media':
      return '#4ecdc4'; // 青色 - 媒体专业
    case 'kol':
      return '#a78bfa'; // 紫色 - KOL影响力
    case 'normal':
      return '#6ee7b7'; // 绿色 - 普通用户
    default:
      return '#94a3b8'; // 灰色
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
      return '#f472b6'; // 粉色 - 点赞
    case 'comment':
      return '#60a5fa'; // 蓝色 - 评论
    case 'repost':
      return '#c084fc'; // 紫色 - 转发
    case 'comprehensive':
      return '#fbbf24'; // 金色 - 综合
    default:
      return '#94a3b8'; // 灰色
  }
}

export function getEdgeOpacity(weight: number): number {
  // 使用对数映射，让权重差异更明显
  const normalizedWeight = Math.min(weight / 100, 1);
  return 0.2 + normalizedWeight * 0.6; // 范围 0.2-0.8
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