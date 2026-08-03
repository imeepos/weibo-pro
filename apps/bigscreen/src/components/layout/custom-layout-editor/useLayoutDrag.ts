import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { LayoutArea } from '../../../stores/useLayoutStore';
import { checkOverlap as checkOverlapUtil, generateAreaId as generateAreaIdUtil, getGridPosition as getGridPositionUtil } from './gridUtils';
import type { DragState, GridPosition } from './types';

export interface UseLayoutDragOptions {
  areas: LayoutArea[];
  setAreas: Dispatch<SetStateAction<LayoutArea[]>>;
  cols: number;
  addToHistory: (newAreas: LayoutArea[]) => void;
  gridRef: RefObject<HTMLDivElement | null>;
  setSelectedArea: (id: string | null) => void;
}

export interface UseLayoutDragResult {
  dragState: DragState;
  previewGrid: GridPosition | null;
  checkOverlap: (newArea: GridPosition, excludeId?: string) => boolean;
  handleGridMouseDown: (e: React.MouseEvent) => void;
  handleAreaMouseDown: (e: React.MouseEvent, area: LayoutArea) => void;
}

export function useLayoutDrag(options: UseLayoutDragOptions): UseLayoutDragResult {
  const { areas, setAreas, cols, addToHistory, gridRef, setSelectedArea } = options;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: 'move',
    startPosition: { x: 0, y: 0 }
  });
  const [previewGrid, setPreviewGrid] = useState<GridPosition | null>(null);

  const checkOverlap = useCallback(
    (newArea: GridPosition, excludeId?: string): boolean => checkOverlapUtil(areas, newArea, excludeId),
    [areas]
  );

  const getGridPosition = useCallback(
    (clientX: number, clientY: number) => getGridPositionUtil(gridRef, clientX, clientY, cols),
    [gridRef, cols]
  );

  const generateAreaId = useCallback((): string => generateAreaIdUtil(), []);

  // 开始拖拽创建新区域
  const handleGridMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === gridRef.current) {
      const position = getGridPosition(e.clientX, e.clientY);
      setDragState({
        isDragging: true,
        dragType: 'create',
        startPosition: position
      });
      setPreviewGrid({ x: position.x, y: position.y, w: 1, h: 1 });
    }
  }, [getGridPosition, gridRef]);

  // 拖拽过程中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;

    const currentPosition = getGridPosition(e.clientX, e.clientY);

    if (dragState.dragType === 'create') {
      const startPos = dragState.startPosition;
      const newGrid: GridPosition = {
        x: Math.min(startPos.x, currentPosition.x),
        y: Math.min(startPos.y, currentPosition.y),
        w: Math.abs(currentPosition.x - startPos.x) + 1,
        h: Math.abs(currentPosition.y - startPos.y) + 1
      };

      // 确保不超出边界
      newGrid.w = Math.min(newGrid.w, cols - newGrid.x);

      setPreviewGrid(newGrid);
    } else if (dragState.dragType === 'move' && dragState.targetArea) {
      const offset = {
        x: currentPosition.x - dragState.startPosition.x,
        y: currentPosition.y - dragState.startPosition.y
      };

      const newPosition = {
        x: Math.max(0, Math.min(dragState.originalArea!.x + offset.x, cols - dragState.targetArea.w)),
        y: Math.max(0, dragState.originalArea!.y + offset.y)
      };

      setAreas(prev => prev.map(area =>
        area.id === dragState.targetArea!.id
          ? { ...area, x: newPosition.x, y: newPosition.y }
          : area
      ));
    }
  }, [dragState, getGridPosition, cols, setAreas]);

  // 结束拖拽
  const handleMouseUp = useCallback(() => {
    if (dragState.dragType === 'create' && previewGrid) {
      // 检查是否有重叠
      if (!checkOverlap(previewGrid)) {
        const newArea: LayoutArea = {
          id: generateAreaId(),
          title: `区域 ${areas.length + 1}`,
          name: `区域 ${areas.length + 1}`,
          x: previewGrid.x,
          y: previewGrid.y,
          w: previewGrid.w,
          h: previewGrid.h,
          component: null,
          type: 'widget',
          placeholder: '点击选择组件'
        };

        const newAreas = [...areas, newArea];
        setAreas(newAreas);
        addToHistory(newAreas);
        setSelectedArea(newArea.id);
      }
    } else if (dragState.dragType === 'move' && dragState.targetArea) {
      addToHistory(areas);
    }

    setDragState({
      isDragging: false,
      dragType: 'move',
      startPosition: { x: 0, y: 0 }
    });
    setPreviewGrid(null);
  }, [dragState, previewGrid, checkOverlap, generateAreaId, areas, addToHistory, setAreas, setSelectedArea]);

  // 开始移动区域
  const handleAreaMouseDown = useCallback((e: React.MouseEvent, area: LayoutArea) => {
    e.stopPropagation();
    const position = getGridPosition(e.clientX, e.clientY);
    setDragState({
      isDragging: true,
      dragType: 'move',
      startPosition: position,
      targetArea: area,
      originalArea: { ...area }
    });
    setSelectedArea(area.id);
  }, [getGridPosition, setSelectedArea]);

  // 监听鼠标事件
  useEffect(() => {
    if (dragState.isDragging) {
      // 禁用文本选择
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        // 恢复文本选择
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  return {
    dragState,
    previewGrid,
    checkOverlap,
    handleGridMouseDown,
    handleAreaMouseDown
  };
}
