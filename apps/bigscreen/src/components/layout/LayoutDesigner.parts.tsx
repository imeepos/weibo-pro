import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Eye, Edit3, Plus, Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { LayoutArea } from "../../stores/useLayoutStore";
import { renderComponent } from "./LayoutComponentProvider";

type Step = "layout" | "design" | "configure" | "custom";

interface StepIndicatorProps {
  currentStep: Step;
  onCancel?: () => void;
}

export function StepIndicator({ currentStep, onCancel }: StepIndicatorProps) {
  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center space-x-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}

        <div className="flex items-center space-x-2">
          <div
            className={twMerge(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              currentStep === "layout"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            )}
          >
            1
          </div>
          <span className="text-sm font-medium">选择布局</span>
        </div>

        <div className="w-8 h-0.5 bg-gray-300"></div>

        <div className="flex items-center space-x-2">
          <div
            className={twMerge(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              currentStep === "design" || currentStep === "custom"
                ? "bg-blue-600 text-white"
                : currentStep === "configure"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-600"
            )}
          >
            2
          </div>
          <span className="text-sm font-medium">
            {currentStep === "custom" ? "新建布局" : "编辑布局"}
          </span>
        </div>
      </div>
    </div>
  );
}

interface LayoutPreviewProps {
  layoutAreas: LayoutArea[];
  selectedArea: string | null;
  isPreviewMode: boolean;
  cols: number;
  onAreaClick: (area: LayoutArea) => void;
  onRemoveComponent: (areaId: string) => void;
}

export function LayoutPreview({
  layoutAreas,
  selectedArea,
  isPreviewMode,
  cols,
  onAreaClick,
  onRemoveComponent,
}: LayoutPreviewProps) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
      <div
        className="grid gap-2 p-4 min-h-[500px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: "repeat(20, 30px)",
        }}
      >
        {layoutAreas.map((area) => (
          <motion.div
            key={area.id}
            className={twMerge(
              "border-2 border-dashed relative rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-2",
              area.component
                ? "border-blue-300 bg-blue-50 hover:bg-blue-100"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100",
              selectedArea === area.id && "ring-2 ring-blue-400",
              isPreviewMode && "cursor-default"
            )}
            style={{
              gridColumn: `${area.x + 1} / ${area.x + area.w + 1}`,
              gridRow: `${area.y + 1} / ${area.y + area.h + 1}`,
            }}
            onClick={() => onAreaClick(area)}
          >
            {area.component ? (
              <div className="flex-1 overflow-hidden absolute top-0 bottom-0 left-0 right-0 p-1">
                {/* 真实组件渲染 */}
                {renderComponent(area.component)}
                {/* 组件操作按钮 */}
                {!isPreviewMode && (
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveComponent(area.id);
                      }}
                      className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Plus className="w-6 h-6 text-gray-400 mb-1" />
                <div className="text-xs text-gray-500">
                  {area.placeholder || "点击选择组件"}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {area.w}×{area.h}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

interface DesignToolbarProps {
  name?: string;
  description?: string;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  onModifyStructure: () => void;
  onSave: () => void;
}

export function DesignToolbar({
  name,
  description,
  isPreviewMode,
  onTogglePreview,
  onModifyStructure,
  onSave,
}: DesignToolbarProps) {
  return (
    <div className="bg-white border-b px-6 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{name}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onTogglePreview}
            className={twMerge(
              "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
              isPreviewMode
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {isPreviewMode ? (
              <Eye className="w-4 h-4" />
            ) : (
              <Edit3 className="w-4 h-4" />
            )}
            <span>{isPreviewMode ? "预览" : "编辑"}</span>
          </button>

          <button
            onClick={onModifyStructure}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>修改布局结构</span>
          </button>

          <button
            onClick={onSave}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>保存布局</span>
          </button>
        </div>
      </div>
    </div>
  );
}
