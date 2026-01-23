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
      className={`grid grid-cols-4 gap-2 ${className || ''}`}
    >
      <div className="backdrop-blur-md bg-background/80 dark:bg-background/60 rounded-xl shadow-lg border border-border/50 p-3">
        <div className="text-lg font-bold text-primary leading-tight">
          {statistics.totalUsers != null ? statistics.totalUsers.toLocaleString() : '-'}
        </div>
        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">节点</div>
      </div>

      <div className="backdrop-blur-md bg-background/80 dark:bg-background/60 rounded-xl shadow-lg border border-border/50 p-3">
        <div className="text-lg font-bold text-violet-500 leading-tight">
          {statistics.totalRelations != null ? statistics.totalRelations.toLocaleString() : '-'}
        </div>
        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">连接</div>
      </div>

      <div className="backdrop-blur-md bg-background/80 dark:bg-background/60 rounded-xl shadow-lg border border-border/50 p-3">
        <div className="text-lg font-bold text-cyan-500 leading-tight">
          {statistics.avgDegree != null ? statistics.avgDegree.toFixed(0) : '-'}
        </div>
        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">平均度</div>
      </div>

      <div className="backdrop-blur-md bg-background/80 dark:bg-background/60 rounded-xl shadow-lg border border-border/50 p-3">
        <div className="text-lg font-bold text-fuchsia-500 leading-tight">
          {statistics.density != null ? (statistics.density * 100).toFixed(0) : '-'}%
        </div>
        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">密度</div>
      </div>
    </motion.div>
  );
};

export default React.memo(NetworkStatisticsCards);
