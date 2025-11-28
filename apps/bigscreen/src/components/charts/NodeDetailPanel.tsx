import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Users } from 'lucide-react';
import { formatNumber } from '@/utils';
import { getUserTypeLabel } from './UserRelationGraph3D.utils';
import type { UserRelationNode } from '@sker/sdk';

interface NodeDetailPanelProps {
  node: UserRelationNode | null;
  position?: 'left' | 'right';
  className?: string;
}

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  position = 'right',
  className,
}) => {
  if (!node) return null;

  const animationX = position === 'right' ? 50 : -50;

  return (
    <motion.div
      initial={{ opacity: 0, x: animationX }}
      animate={{ opacity: 1, x: 0 }}
      className={`glass-card p-3 ${className || ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">节点详情</h3>
      </div>

      <div className="space-y-1.5 text-xs">
        <div>
          <div className="text-[10px] text-muted-foreground">用户名</div>
          <div className="font-medium">{node.name}</div>
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground">用户类型</div>
          <div className="font-medium">{getUserTypeLabel(node.userType)}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-muted-foreground">粉丝数</div>
            <div className="font-medium text-primary">{formatNumber(node.followers)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">发帖数</div>
            <div className="font-medium text-sentiment-positive">{formatNumber(node.postCount)}</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground">影响力</div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan via-primary to-violet"
                initial={{ width: 0 }}
                animate={{ width: `${node.influence}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[10px] font-medium">{node.influence}/100</span>
          </div>
        </div>

        {node.location && (
          <div>
            <div className="text-[10px] text-muted-foreground">位置</div>
            <div className="font-medium">{node.location}</div>
          </div>
        )}

        {node.verified && (
          <div className="flex items-center gap-2 text-primary text-xs">
            <Users className="w-3 h-3" />
            <span>已认证</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(NodeDetailPanel);
