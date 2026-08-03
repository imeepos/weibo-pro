import React from 'react';
import { motion } from 'framer-motion';
import { Search, X, Check } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import {
  categoryColors,
  sizeLabels,
  type ComponentOption,
} from './ComponentSelector.data';

interface ComponentCardProps {
  component: ComponentOption;
  selected: boolean;
  preview: React.ReactNode;
  onSelect: () => void;
}

export function ComponentCard({ component, selected, preview, onSelect }: ComponentCardProps) {
  return (
    <motion.div
      key={component.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={twMerge(
        'border rounded-lg p-4 cursor-pointer transition-all duration-200',
        selected
          ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
      )}
      onClick={onSelect}
    >
      {/* 组件预览 */}
      {preview}

      {/* 组件信息 */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
            {component.icon}
            <span className="ml-2">{component.name}</span>
          </h3>
          {selected && <Check className="w-4 h-4 text-primary" />}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {component.description}
        </p>

        <div className="flex items-center justify-between">
          <span className={twMerge(
            'px-2 py-1 rounded text-xs font-medium border',
            categoryColors[component.category]
          )}>
            {component.category}
          </span>

          <span className="text-xs text-gray-500">
            {sizeLabels[component.size]}
          </span>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1">
          {component.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: SearchFilterProps) {
  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="搜索组件..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-colors"
        />
      </div>

      {/* 分类过滤 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onCategoryChange('all')}
          className={twMerge(
            'px-3 py-1 rounded-full text-sm font-medium transition-colors',
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          全部
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={twMerge(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize',
              selectedCategory === category
                ? categoryColors[category]
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SelectorHeaderProps {
  areaSize?: { w: number; h: number };
  onClose: () => void;
  children: React.ReactNode;
}

export function SelectorHeader({ areaSize, onClose, children }: SelectorHeaderProps) {
  return (
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">选择组件</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            为当前区域选择合适的可视化组件
            {areaSize && (
              <span className="ml-2 text-primary">
                (区域大小: {areaSize.w}×{areaSize.h})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {children}
    </div>
  );
}

interface SelectorFooterProps {
  count: number;
  hasSelection: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SelectorFooter({ count, hasSelection, onCancel, onConfirm }: SelectorFooterProps) {
  return (
    <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          找到 {count} 个组件
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!hasSelection}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyResult() {
  return (
    <div className="text-center py-8">
      <div className="text-gray-400 dark:text-gray-600 mb-2">
        <Search className="w-8 h-8 mx-auto" />
      </div>
      <p className="text-gray-500 dark:text-gray-400">未找到匹配的组件</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
        尝试调整搜索条件或分类筛选
      </p>
    </div>
  );
}
