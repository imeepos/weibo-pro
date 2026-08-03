import React from 'react';
import { Redo, Save, Settings, Undo } from 'lucide-react';

export interface EditorToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onCancel?: () => void;
  onSave: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
  onCancel,
  onSave
}) => {
  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">自定义布局编辑器</h2>
          <p className="text-sm text-gray-600">拖拽创建区域，设计你的专属布局</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* 历史操作 */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="撤销"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            title="重做"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* 设置 */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="布局设置"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 保存和取消 */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              取消
            </button>
          )}

          <button
            onClick={onSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>保存布局</span>
          </button>
        </div>
      </div>
    </div>
  );
};
