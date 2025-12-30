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
      className={`backdrop-blur-md bg-background/80 dark:bg-background/60 rounded-xl shadow-2xl border border-border/50 p-4 ${className || ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">节点详情</h3>
      </div>

      <div className="space-y-2.5 text-xs">
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">用户名</div>
          <div className="font-medium text-foreground">{node.name}</div>
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">用户类型</div>
          <div className="font-medium text-foreground">{getUserTypeLabel(node.userType)}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-accent/30 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground mb-0.5">粉丝数</div>
            <div className="font-semibold text-primary">{formatNumber(node.followers)}</div>
          </div>
          <div className="bg-accent/30 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground mb-0.5">发帖数</div>
            <div className="font-semibold text-foreground">{formatNumber(node.postCount)}</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground mb-1">影响力</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-accent/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 via-primary to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: `${node.influence}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[10px] font-semibold text-foreground">{node.influence}/100</span>
          </div>
        </div>

        {node.location && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-0.5">位置</div>
            <div className="font-medium text-foreground">{node.location}</div>
          </div>
        )}

        {node.verified && (
          <div className="flex items-center gap-2 text-primary text-xs bg-primary/10 rounded-lg px-2 py-1">
            <Users className="w-3 h-3" />
            <span>已认证</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default React.memo(NodeDetailPanel);
