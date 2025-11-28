import React from 'react';
import { motion } from 'framer-motion';

interface NetworkStatisticsCardsProps {
  statistics: {
    totalUsers: number;
    totalRelations: number;
    avgDegree: number;
    density: number;
  };
  animationDelay?: number;
  className?: string;
}

const NetworkStatisticsCards: React.FC<NetworkStatisticsCardsProps> = ({
  statistics,
  animationDelay = 0.5,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className={`grid grid-cols-4 gap-1 ${className || ''}`}
    >
      <div className="glass-card p-1.5">
        <div className="text-base font-bold text-primary leading-tight">
          {statistics.totalUsers}
        </div>
        <div className="text-[9px] text-muted-foreground leading-tight">节点</div>
      </div>

      <div className="glass-card p-1.5">
        <div className="text-base font-bold text-violet leading-tight">
          {statistics.totalRelations}
        </div>
        <div className="text-[9px] text-muted-foreground leading-tight">连接</div>
      </div>

      <div className="glass-card p-1.5">
        <div className="text-base font-bold text-cyan leading-tight">
          {statistics.avgDegree.toFixed(0)}
        </div>
        <div className="text-[9px] text-muted-foreground leading-tight">平均度</div>
      </div>

      <div className="glass-card p-1.5">
        <div className="text-base font-bold text-fuchsia leading-tight">
          {(statistics.density * 100).toFixed(0)}%
        </div>
        <div className="text-[9px] text-muted-foreground leading-tight">密度</div>
      </div>
    </motion.div>
  );
};

export default React.memo(NetworkStatisticsCards);
