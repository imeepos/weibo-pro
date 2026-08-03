import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { twMerge } from "tailwind-merge";
import {
  LayoutSelector,
} from "./LayoutSelector";
import { LayoutConfig, LayoutArea, useLayoutStore } from "../../stores/useLayoutStore";
import { ComponentSelector, ComponentOption } from "./ComponentSelector";
import { CustomLayoutEditor } from "./CustomLayoutEditor";
import { useToast } from "../ui/Toast";
import {
  areasFromLayout,
  createCustomLayoutConfig,
  createUpdatedLayoutConfig,
} from "./LayoutDesigner.utils";
import {
  StepIndicator,
  LayoutPreview,
  DesignToolbar,
} from "./LayoutDesigner.parts";

interface LayoutDesignerProps {
  onSave?: (layout: LayoutConfig) => void;
  onCancel?: () => void;
  initialLayout?: LayoutConfig | null;
  className?: string;
}

export const LayoutDesigner: React.FC<LayoutDesignerProps> = ({
  onSave,
  onCancel,
  initialLayout,
  className,
}) => {
  const { saveLayout: saveToLayoutStore } = useLayoutStore();
  const { success, error } = useToast();
  const [currentStep, setCurrentStep] = useState<
    "layout" | "design" | "configure" | "custom"
  >("layout");
  const [selectedLayout, setSelectedLayout] =
    useState<LayoutConfig | null>(
      initialLayout || null
    );
  const [layoutAreas, setLayoutAreas] = useState<LayoutArea[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedArea] = useState<string | null>(null);
  const [showComponentSelector, setShowComponentSelector] = useState(false);
  const [currentArea, setCurrentArea] = useState<LayoutArea | null>(null);

  // 选择布局后进入设计步骤
  const handleLayoutSelect = useCallback((layout: LayoutConfig) => {
    setSelectedLayout(layout);
    setLayoutAreas(areasFromLayout(layout));
    setCurrentStep("design");
  }, []);

  // 创建新布局
  const handleCreateCustom = useCallback(() => {
    setCurrentStep("custom");
  }, []);

  // 新布局保存
  const handleCustomLayoutSave = useCallback(
    (
      areas: LayoutArea[],
      config: { cols: number; name: string; description: string }
    ) => {
      try {
        const layoutConfig = createCustomLayoutConfig(areas, config);

        saveToLayoutStore(layoutConfig);
        success('布局保存成功', `新布局 "${config.name}" 已成功保存！`);

        setSelectedLayout(layoutConfig);
        setLayoutAreas(areas);
        setCurrentStep("design");
      } catch (err) {
        error('保存失败', '保存布局失败：' + (err as Error).message);
      }
    },
    [saveToLayoutStore]
  );

  // 为区域选择组件
  const handleAreaClick = useCallback(
    (area: LayoutArea) => {
      if (!isPreviewMode) {
        setCurrentArea(area);
        setShowComponentSelector(true);
      }
    },
    [isPreviewMode]
  );

  // 组件选择完成
  const handleComponentSelect = useCallback(
    (component: ComponentOption) => {
      if (currentArea) {
        setLayoutAreas((prev) =>
          prev.map((area) =>
            area.id === currentArea.id
              ? { ...area, component: component.id, placeholder: undefined }
              : area
          )
        );
        setShowComponentSelector(false);
        setCurrentArea(null);
      }
    },
    [currentArea]
  );

  // 删除区域中的组件
  const handleRemoveComponent = useCallback((areaId: string) => {
    setLayoutAreas((prev) =>
      prev.map((area) =>
        area.id === areaId
          ? {
              ...area,
              component: null,
              placeholder: area.placeholder || "选择组件",
            }
          : area
      )
    );
  }, []);

  // 保存布局
  const handleSave = useCallback(() => {
    if (selectedLayout) {
      try {
        const updatedLayout = createUpdatedLayoutConfig(selectedLayout, layoutAreas);

        saveToLayoutStore(updatedLayout);
        success('布局保存成功', `布局 "${updatedLayout.name}" 已成功保存！`);

        // 如果有外部回调，也调用它
        if (onSave) {
          onSave(updatedLayout);
        }
      } catch (err) {
        error('保存失败', '保存布局失败：' + (err as Error).message);
      }
    }
  }, [selectedLayout, layoutAreas, onSave, saveToLayoutStore]);

  return (
    <div className={twMerge("h-full flex flex-col", className)}>
      {/* 步骤指示器 */}
      <StepIndicator currentStep={currentStep} onCancel={onCancel} />

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* 步骤1: 选择布局 */}
          {currentStep === "layout" && (
            <motion.div
              key="layout-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto p-6"
            >
              <LayoutSelector
                onSelectLayout={handleLayoutSelect}
                onCreateCustom={handleCreateCustom}
              />
            </motion.div>
          )}

          {/* 步骤2: 设计配置 */}
          {currentStep === "design" && selectedLayout && (
            <motion.div
              key="design-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col"
            >
              {/* 工具栏 */}
              <DesignToolbar
                name={selectedLayout.name}
                description={selectedLayout.description}
                isPreviewMode={isPreviewMode}
                onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
                onModifyStructure={() => setCurrentStep("custom")}
                onSave={handleSave}
              />

              {/* 布局画布 */}
              <div className="flex-1 p-6 bg-gray-50 overflow-auto">
                <LayoutPreview
                  layoutAreas={layoutAreas}
                  selectedArea={selectedArea}
                  isPreviewMode={isPreviewMode}
                  cols={selectedLayout.cols}
                  onAreaClick={handleAreaClick}
                  onRemoveComponent={handleRemoveComponent}
                />
              </div>
            </motion.div>
          )}

          {/* 步骤: 新建/编辑布局 */}
          {currentStep === "custom" && (
            <motion.div
              key="custom-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <CustomLayoutEditor
                initialAreas={layoutAreas}
                cols={selectedLayout?.cols || 12}
                initialName={selectedLayout?.name || "新布局"}
                initialDescription={
                  selectedLayout?.description || "用户创建的布局"
                }
                onSave={handleCustomLayoutSave}
                onCancel={() =>
                  setCurrentStep(selectedLayout ? "design" : "layout")
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 组件选择器 */}
      <ComponentSelector
        isOpen={showComponentSelector}
        onClose={() => {
          setShowComponentSelector(false);
          setCurrentArea(null);
        }}
        onSelect={handleComponentSelect}
        areaSize={
          currentArea ? { w: currentArea.w, h: currentArea.h } : undefined
        }
        areaType={currentArea?.type}
        allowedComponents={currentArea?.allowedComponents}
        currentComponent={currentArea?.component}
      />
    </div>
  );
};
