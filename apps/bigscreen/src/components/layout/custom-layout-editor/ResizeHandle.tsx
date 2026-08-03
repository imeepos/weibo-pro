import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ResizeHandleProps } from './types';

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  area,
  cols,
  onResize,
  direction,
  className
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ w: 0, h: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { w: area.w, h: area.h };
  }, [area.w, area.h]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    // 计算网格单位的变化
    const gridDeltaX = Math.round(deltaX / (window.innerWidth * 0.8 / cols)); // 假设网格占80%宽度
    const gridDeltaY = Math.round(deltaY / 30); // 每行30px

    let newW = startSize.current.w;
    let newH = startSize.current.h;

    if (direction.includes('e')) {
      newW = Math.max(1, Math.min(startSize.current.w + gridDeltaX, cols - area.x));
    }
    if (direction.includes('s')) {
      newH = Math.max(1, startSize.current.h + gridDeltaY);
    }

    if (newW !== area.w || newH !== area.h) {
      onResize({ w: newW, h: newH });
    }
  }, [isResizing, area.x, area.w, area.h, cols, direction, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={className}
      onMouseDown={handleMouseDown}
    />
  );
};
