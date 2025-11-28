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
      className={`glass-card px-2 py-1.5 text-[10px] ${className || ''}`}
    >
      <div className="font-semibold mb-0.5">节点类型</div>
      <div className="space-y-0.5">
        {types.map((type) => (
          <div key={type.value} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: type.color }}
            />
            <span>{type.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default React.memo(NodeTypeLegend);
