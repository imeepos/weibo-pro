import React, { useState, useCallback } from 'react';
import {
  Settings,
  Save,
  Plus,
  Download,
  RotateCcw,
  Edit3,
  Eye
} from 'lucide-react';
import { GridContainer, GridItem } from './GridContainer';
import { useLayoutStore, WidgetConfig } from '../../stores/useLayoutStore';
import { twMerge } from 'tailwind-merge';
import { legacyComponentMap as componentMap } from './LayoutComponentProvider';
import { findBestPosition } from './LayoutEditor.utils';
import { WidgetPanel } from './WidgetPanel';
import { LayoutSettingsPanel } from './LayoutSettingsPanel';

export const LayoutEditor: React.FC = () => {
  const {
    currentLayout,
    availableWidgets,
    isEditMode,
    updateGridItems,
    addGridItem,
    toggleEditMode,
    saveLayout,
    resetToDefault
  } = useLayoutStore();

  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);

  const handleLayoutChange = useCallback((items: GridItem[]) => {
    updateGridItems(items);
  }, [updateGridItems]);

  const handleAddWidget = useCallback((widget: WidgetConfig) => {
    if (!currentLayout) return;

    // 找到合适的位置放置新组件
    const bestPosition = findBestPosition(
      currentLayout.items,
      currentLayout.cols,
      widget.defaultSize.w,
      widget.defaultSize.h,
    );

    if (componentMap[widget.component]) {
      addGridItem({
        x: bestPosition.x,
        y: bestPosition.y,
        w: widget.defaultSize.w,
        h: widget.defaultSize.h,
        component: widget.component,
        props: widget.defaultProps || {},
        minW: widget.minSize?.w,
        minH: widget.minSize?.h,
        maxW: widget.maxSize?.w,
        maxH: widget.maxSize?.h
      });
    }

    setShowWidgetPanel(false);
  }, [currentLayout, addGridItem]);

  const handleSaveLayout = useCallback(() => {
    if (currentLayout) {
      saveLayout(currentLayout);
      // 可以添加保存成功的提示
    }
  }, [currentLayout, saveLayout]);

  const handleExportLayout = useCallback(() => {
    if (currentLayout) {
      const dataStr = JSON.stringify(currentLayout, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentLayout.name}-layout.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [currentLayout]);

  if (!currentLayout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载布局中...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {currentLayout.name}
          </h2>
          <span className="text-sm text-gray-500">
            {isEditMode ? '编辑模式' : '预览模式'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleEditMode}
            className={twMerge(
              'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors',
              isEditMode
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {isEditMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{isEditMode ? '编辑' : '预览'}</span>
          </button>

          {isEditMode && (
            <>
              <button
                onClick={() => setShowWidgetPanel(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加组件</span>
              </button>

              <button
                onClick={() => setShowLayoutSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="布局设置"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={handleSaveLayout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="保存布局"
              >
                <Save className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportLayout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="导出布局"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={resetToDefault}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="重置为默认"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 布局画布 */}
      <div className="flex-1 p-4 bg-gray-50 overflow-auto">
        <GridContainer
          items={currentLayout.items.map(item => ({
            ...item,
            component: typeof item.component === 'string'
              ? componentMap[item.component as keyof typeof componentMap] || componentMap['StatsOverview']
              : item.component
          }))}
          onLayoutChange={handleLayoutChange}
          cols={currentLayout.cols}
          rowHeight={currentLayout.rowHeight}
          gap={currentLayout.gap}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          className="min-h-full"
        />
      </div>

      {/* 组件面板 */}
      <WidgetPanel
        open={showWidgetPanel}
        widgets={availableWidgets}
        onSelect={handleAddWidget}
        onClose={() => setShowWidgetPanel(false)}
      />

      {/* 布局设置面板 */}
      <LayoutSettingsPanel
        open={showLayoutSettings}
        layout={currentLayout}
        onClose={() => setShowLayoutSettings(false)}
      />
    </div>
  );
};
