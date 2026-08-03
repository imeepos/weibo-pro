import type { RefObject } from 'react';
import type { LayoutArea } from '../../../stores/useLayoutStore';
import type { GridPosition } from './types';

export interface GridCoordinate {
  x: number;
  y: number;
}

// 获取网格位置
export function getGridPosition(
  gridRef: RefObject<HTMLDivElement | null>,
  clientX: number,
  clientY: number,
  cols: number
): GridCoordinate {
  if (!gridRef.current) return { x: 0, y: 0 };

  const rect = gridRef.current.getBoundingClientRect();
  const x = Math.floor(((clientX - rect.left) / rect.width) * cols);
  const y = Math.floor(((clientY - rect.top) / rect.height) * 20); // 假设最大20行

  return {
    x: Math.max(0, Math.min(x, cols - 1)),
    y: Math.max(0, y)
  };
}

// 检查区域是否重叠
export function checkOverlap(areas: LayoutArea[], newArea: GridPosition, excludeId?: string): boolean {
  return areas.some(area => {
    if (excludeId && area.id === excludeId) return false;

    return !(
      newArea.x >= area.x + area.w ||
      newArea.x + newArea.w <= area.x ||
      newArea.y >= area.y + area.h ||
      newArea.y + newArea.h <= area.y
    );
  });
}

// 生成新的区域ID
export function generateAreaId(): string {
  return `area-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
