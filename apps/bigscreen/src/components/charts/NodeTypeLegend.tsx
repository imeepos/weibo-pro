import React from 'react';
import { motion } from 'framer-motion';

export interface NodeType {
  value: string;
  label: string;
  color: string;
}

interface NodeTypeLegendProps {
  types: NodeType[];
  animationDelay?: number;
  className?: string;
}

const NodeTypeLegend: React.FC<NodeTypeLegendProps> = ({
  types,
  animationDelay = 0.4,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay }}
      className={`backdrop-blur-md bg-background/80 dark:bg-background/60 rounded-xl shadow-lg border border-border/50 px-3 py-2.5 text-xs ${className || ''}`}
    >
      <div className="font-semibold mb-2 text-foreground">节点类型</div>
      <div className="space-y-1.5">
        {types.map((type) => (
          <div key={type.value} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ background: type.color }}
            />
            <span className="text-foreground">{type.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default React.memo(NodeTypeLegend);
