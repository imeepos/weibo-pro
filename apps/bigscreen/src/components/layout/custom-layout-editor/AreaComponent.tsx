import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { renderComponent } from '../LayoutComponentProvider';
import { ResizeHandle } from './ResizeHandle';
import type { AreaComponentProps } from './types';

export const AreaComponent: React.FC<AreaComponentProps> = ({
  area,
  isSelected,
  cols,
  onMouseDown,
  onDelete,
  onEdit,
  onResize
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(area.name);

  const handleNameSubmit = () => {
    onEdit({ name: editName });
    setIsEditing(false);
  };

  return (
    <motion.div
      className={twMerge(
        'absolute border-2 rounded-lg bg-white shadow-sm transition-all duration-200 cursor-move select-none',
        isSelected
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
          : 'border-gray-300 hover:border-gray-400'
      )}
      style={{
        left: `${(area.x / cols) * 100}%`,
        top: `${area.y * 30}px`,
        width: `${(area.w / cols) * 100}%`,
        height: `${area.h * 30}px`,
        minHeight: '60px'
      }}
      onMouseDown={onMouseDown}
    >
      {/* 区域标题栏 */}
      <div
        className="bg-gray-50 border-b border-gray-200 px-3 py-2 cursor-move flex items-center justify-between"
        onMouseDown={onMouseDown}
      >
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            className="text-sm font-medium bg-transparent border-none outline-none flex-1"
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-medium text-gray-700 flex-1 cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            {area.name}
          </span>
        )}

        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
          >
            <Edit className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 区域内容 */}
      <div className="flex-1 overflow-hidden">
        {area.component ? (
          <div className="h-full w-full">
            {renderComponent(area.component)}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div className="text-gray-500 text-sm">
              {area.placeholder || '点击选择组件'}
              <div className="text-xs text-gray-400 mt-1">
                {area.w} × {area.h}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 调整大小的控制点 */}
      {isSelected && (
        <>
          {/* 调整大小的控制点 */}
          <ResizeHandle
            area={area}
            cols={cols}
            onResize={onResize}
            direction="se"
            className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
          />
          <ResizeHandle
            area={area}
            cols={cols}
            onResize={onResize}
            direction="e"
            className="absolute top-1/2 right-0 w-2 h-6 bg-blue-500 cursor-e-resize transform -translate-y-1/2"
          />
          <ResizeHandle
            area={area}
            cols={cols}
            onResize={onResize}
            direction="s"
            className="absolute bottom-0 left-1/2 w-6 h-2 bg-blue-500 cursor-s-resize transform -translate-x-1/2"
          />
        </>
      )}
    </motion.div>
  );
};
