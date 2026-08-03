import React from 'react';
import { Maximize2, Move, Square } from 'lucide-react';

export const HintBar: React.FC = () => {
  return (
    <div className="bg-blue-50 border-b px-6 py-3">
      <div className="flex items-center space-x-4 text-sm text-blue-700">
        <div className="flex items-center space-x-1">
          <Square className="w-4 h-4" />
          <span>在网格上拖拽创建新区域</span>
        </div>
        <div className="flex items-center space-x-1">
          <Move className="w-4 h-4" />
          <span>拖拽区域标题可移动位置</span>
        </div>
        <div className="flex items-center space-x-1">
          <Maximize2 className="w-4 h-4" />
          <span>拖拽区域边角可调整大小</span>
        </div>
      </div>
    </div>
  );
};
