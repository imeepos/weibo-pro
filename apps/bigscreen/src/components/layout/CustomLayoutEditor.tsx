import React, { useCallback, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { LayoutArea } from '../../stores/useLayoutStore';
import {
  EditorToolbar,
  HintBar,
  LayoutGrid,
  SettingsModal,
  useLayoutDrag,
  useLayoutHistory
} from './custom-layout-editor';
import type { CustomLayoutEditorProps } from './custom-layout-editor';

export const CustomLayoutEditor: React.FC<CustomLayoutEditorProps> = ({
  initialAreas = [],
  cols = 12,
  initialName = '自定义布局',
  initialDescription = '用户自定义创建的布局',
  onSave,
  onCancel,
  className
}) => {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [layoutConfig, setLayoutConfig] = useState({
    cols,
    name: initialName,
    description: initialDescription
  });
  const [showSettings, setShowSettings] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  const { areas, setAreas, history, historyIndex, addToHistory, undo, redo } = useLayoutHistory(initialAreas);

  const {
    dragState,
    previewGrid,
    checkOverlap,
    handleGridMouseDown,
    handleAreaMouseDown
  } = useLayoutDrag({
    areas,
    setAreas,
    cols: layoutConfig.cols,
    addToHistory,
    gridRef,
    setSelectedArea
  });

  // 删除区域
  const handleDeleteArea = useCallback((areaId: string) => {
    const newAreas = areas.filter(area => area.id !== areaId);
    setAreas(newAreas);
    addToHistory(newAreas);
    setSelectedArea(null);
  }, [areas, addToHistory, setAreas]);

  // 编辑区域属性
  const handleEditArea = useCallback((areaId: string, updates: Partial<LayoutArea>) => {
    const newAreas = areas.map(area =>
      area.id === areaId ? { ...area, ...updates } : area
    );
    setAreas(newAreas);
    addToHistory(newAreas);
  }, [areas, addToHistory, setAreas]);

  // 调整区域大小
  const handleResizeArea = useCallback((areaId: string, newSize: { w: number; h: number }) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    const newArea = { ...area, ...newSize };

    // 确保不超出边界
    newArea.w = Math.min(newArea.w, layoutConfig.cols - newArea.x);

    // 检查重叠
    if (!checkOverlap(newArea, areaId)) {
      handleEditArea(areaId, newSize);
    }
  }, [areas, layoutConfig.cols, checkOverlap, handleEditArea]);

  // 保存布局
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(areas, layoutConfig);
    }
  }, [areas, layoutConfig, onSave]);

  return (
    <div className={twMerge(
      'h-full flex flex-col bg-gray-50',
      dragState.isDragging && 'select-none',
      className
    )}>
      <EditorToolbar
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
        onOpenSettings={() => setShowSettings(true)}
        onCancel={onCancel}
        onSave={handleSave}
      />

      <HintBar />

      <div className="flex-1 p-6 overflow-auto">
        <LayoutGrid
          gridRef={gridRef}
          areas={areas}
          cols={layoutConfig.cols}
          dragState={dragState}
          previewGrid={previewGrid}
          selectedArea={selectedArea}
          checkOverlap={checkOverlap}
          onGridMouseDown={handleGridMouseDown}
          onAreaMouseDown={handleAreaMouseDown}
          onDeleteArea={handleDeleteArea}
          onEditArea={handleEditArea}
          onResizeArea={handleResizeArea}
        />
      </div>

      <SettingsModal
        open={showSettings}
        layoutConfig={layoutConfig}
        onClose={() => setShowSettings(false)}
        onChange={setLayoutConfig}
      />
    </div>
  );
};
