'use client'

import React from 'react'
import { cn } from '@sker/ui/lib/utils'
import { CATEGORIES, type CategoryKey } from './workflow-node-selector-categories'

export function CategoryList({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: CategoryKey
  onSelectCategory: (key: CategoryKey) => void
}) {
  return (
    <div className="flex flex-col w-32 border-r border-border bg-muted/30 rounded-l-xl">
      <div className="px-3 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground">分类</h3>
      </div>
      <div className="flex flex-col gap-1 p-2">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          const isActive = selectedCategory === category.key
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => onSelectCategory(category.key)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span>{category.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
