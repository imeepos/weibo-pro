import React from 'react';
import { motion } from 'framer-motion';
import { Grid } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { LayoutArea } from '../../../stores/useLayoutStore';
import { AreaComponent } from './AreaComponent';
import type { DragState, GridPosition } from './types';

export interface LayoutGridProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  areas: LayoutArea[];
  cols: number;
  dragState: DragState;
  previewGrid: GridPosition | null;
  selectedArea: string | null;
  checkOverlap: (newArea: GridPosition, excludeId?: string) => boolean;
  onGridMouseDown: (e: React.MouseEvent) => void;
  onAreaMouseDown: (e: React.MouseEvent, area: LayoutArea) => void;
  onDeleteArea: (areaId: string) => void;
  onEditArea: (areaId: string, updates: Partial<LayoutArea>) => void;
  onResizeArea: (areaId: string, size: { w: number; h: number }) => void;
}

export const LayoutGrid: React.FC<LayoutGridProps> = ({
  gridRef,
  areas,
  cols,
  dragState,
  previewGrid,
  selectedArea,
  checkOverlap,
  onGridMouseDown,
  onAreaMouseDown,
  onDeleteArea,
  onEditArea,
  onResizeArea
}) => {
  return (
    <>
      {/* 网格容器 */}
      <div
        ref={gridRef}
        className={twMerge(
          "relative bg-gray-50 border border-gray-200 rounded-lg min-h-[600px] transition-all duration-200 select-none",
          dragState.isDragging && dragState.dragType === 'create'
            ? "cursor-crosshair bg-blue-50/40 border-blue-200"
            : "cursor-crosshair hover:bg-blue-50/20 hover:border-blue-100"
        )}
        style={{
          cursor: `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' stroke='%23000' stroke-width='1.5'%3e%3cpath d='M10 1v18M1 10h18'/%3e%3c/g%3e%3c/svg%3e") 10 10, crosshair`,
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: `${100 / cols}% 30px`,
          boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.1)'
        }}
        onMouseDown={onGridMouseDown}
      >
        {/* 网格线 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: 'repeat(20, 30px)',
            gap: '1px'
          }}
        >
          {Array.from({ length: cols * 20 }).map((_, i) => (
            <div key={i} className="border border-gray-100"></div>
          ))}
        </div>

        {/* 预览区域 */}
        {previewGrid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={twMerge(
              'absolute border-2 border-blue-400 bg-blue-50 bg-opacity-80 rounded-lg pointer-events-none shadow-sm backdrop-blur-sm',
              checkOverlap(previewGrid) && 'border-red-400 bg-red-50'
            )}
            style={{
              left: `${(previewGrid.x / cols) * 100}%`,
              top: `${previewGrid.y * 30}px`,
              width: `${(previewGrid.w / cols) * 100}%`,
              height: `${previewGrid.h * 30}px`
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-blue-700">
              {previewGrid.w} × {previewGrid.h}
            </div>
          </motion.div>
        )}

        {/* 现有区域 */}
        {areas.map((area) => (
          <AreaComponent
            key={area.id}
            area={area}
            isSelected={selectedArea === area.id}
            cols={cols}
            onMouseDown={(e) => onAreaMouseDown(e, area)}
            onDelete={() => onDeleteArea(area.id)}
            onEdit={(updates) => onEditArea(area.id, updates)}
            onResize={(size) => onResizeArea(area.id, size)}
          />
        ))}
      </div>

      {/* 空状态提示 */}
      {areas.length === 0 && !previewGrid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <Grid className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">开始创建你的布局</p>
            <p className="text-sm">在网格上拖拽鼠标创建第一个区域</p>
          </div>
        </div>
      )}
    </>
  );
};
