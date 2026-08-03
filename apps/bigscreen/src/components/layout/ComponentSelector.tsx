import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { renderComponent } from './LayoutComponentProvider';
import { useDebounce } from '@sker/ui/hooks/use-debounce';
import { availableComponents, type ComponentOption } from './ComponentSelector.data';
import {
  ComponentCard,
  SearchFilter,
  SelectorHeader,
  SelectorFooter,
  EmptyResult,
} from './ComponentSelector.parts';

export type { ComponentOption } from './ComponentSelector.data';

interface ComponentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (component: ComponentOption) => void;
  areaType?: 'widget' | 'container';
  areaSize?: { w: number; h: number };
  allowedComponents?: string[];
  currentComponent?: string | null;
  className?: string;
}

export const ComponentSelector: React.FC<ComponentSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  areaSize,
  allowedComponents,
  currentComponent,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(currentComponent || null);

  // 过滤组件
  const filteredComponents = useMemo(() => {
    return availableComponents.filter(component => {
      // 文本搜索
      const matchesSearch = component.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           component.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           component.tags.some(tag => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      // 分类过滤
      const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory;

      // 允许的组件列表
      const isAllowed = !allowedComponents || allowedComponents.includes(component.id);

      // 尺寸适配检查
      const fitsSize = !areaSize || !component.minSize ||
                      (areaSize.w >= component.minSize.w && areaSize.h >= component.minSize.h);

      return matchesSearch && matchesCategory && isAllowed && fitsSize;
    });
  }, [debouncedSearchTerm, selectedCategory, allowedComponents, areaSize]);

  const categories = useMemo(
    () => Array.from(new Set(availableComponents.map(c => c.category))),
    []
  );

  const handleSelect = (component: ComponentOption) => {
    setSelectedComponent(component.id);
    onSelect(component);
  };

  const renderComponentPreview = (component: ComponentOption) => {
    try {
      // 尝试渲染真实组件的缩略图版本
      return (
        <div className="w-full h-20 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="transform scale-50 origin-top-left w-[200%] h-[200%] pointer-events-none">
            {renderComponent(component.id)}
          </div>
        </div>
      );
    } catch (_error) {
      // 如果组件渲染失败，回退到原始预览
      return (
        <div className="w-full h-20 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center">
          {component.icon}
          <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">{component.name}</span>
        </div>
      );
    }
  };

  const handleConfirm = () => {
    if (selectedComponent) {
      const component = availableComponents.find(c => c.id === selectedComponent);
      if (component) {
        handleSelect(component);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={twMerge(
            'glass-card w-full max-w-4xl max-h-[80vh] overflow-hidden',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <SelectorHeader areaSize={areaSize} onClose={onClose}>
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </SelectorHeader>

          {/* 组件列表 */}
          <div className="p-6 overflow-y-auto max-h-96">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredComponents.map((component) => (
                <ComponentCard
                  key={component.id}
                  component={component}
                  selected={selectedComponent === component.id}
                  preview={renderComponentPreview(component)}
                  onSelect={() => handleSelect(component)}
                />
              ))}
            </div>

            {filteredComponents.length === 0 && <EmptyResult />}
          </div>

          {/* 底部操作 */}
          <SelectorFooter
            count={filteredComponents.length}
            hasSelection={!!selectedComponent}
            onCancel={onClose}
            onConfirm={handleConfirm}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
