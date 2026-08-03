import type React from 'react';
import type { LayoutArea } from '../../../stores/useLayoutStore';

export interface CustomLayoutEditorProps {
  initialAreas?: LayoutArea[];
  cols?: number;
  initialName?: string;
  initialDescription?: string;
  onSave?: (areas: LayoutArea[], config: { cols: number; name: string; description: string }) => void;
  onCancel?: () => void;
  className?: string;
}

export interface DragState {
  isDragging: boolean;
  dragType: 'move' | 'resize' | 'create';
  startPosition: { x: number; y: number };
  targetArea?: LayoutArea;
  originalArea?: LayoutArea;
}

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutConfig {
  cols: number;
  name: string;
  description: string;
}

export interface AreaComponentProps {
  area: LayoutArea;
  isSelected: boolean;
  cols: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onEdit: (updates: Partial<LayoutArea>) => void;
  onResize: (size: { w: number; h: number }) => void;
}

export interface ResizeHandleProps {
  area: LayoutArea;
  cols: number;
  onResize: (size: { w: number; h: number }) => void;
  direction: 'e' | 's' | 'se';
  className: string;
}
