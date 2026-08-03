'use client'

import React from 'react'
import { Eye, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react'
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@sker/ui/components/ui/menubar'
import type { WorkflowMenubarProps } from './workflow-menubar-types'

export interface ViewMenuProps
  extends Pick<
    WorkflowMenubarProps,
    'onZoomIn' | 'onZoomOut' | 'onFitView' | 'onCollapseNodes' | 'onExpandNodes'
  > {}

export function ViewMenu({
  onZoomIn,
  onZoomOut,
  onFitView,
  onCollapseNodes,
  onExpandNodes,
}: ViewMenuProps) {
  if (!(onZoomIn || onZoomOut || onFitView || onCollapseNodes || onExpandNodes)) return null

  return (
    <MenubarMenu>
      <MenubarTrigger>
        <Eye className="mr-1.5 h-3.5 w-3.5" />
        视图
      </MenubarTrigger>
      <MenubarContent>
        {onZoomIn && (
          <MenubarItem onSelect={onZoomIn}>
            <ZoomIn className="mr-2 h-4 w-4" />
            放大
          </MenubarItem>
        )}
        {onZoomOut && (
          <MenubarItem onSelect={onZoomOut}>
            <ZoomOut className="mr-2 h-4 w-4" />
            缩小
          </MenubarItem>
        )}
        {onFitView && (
          <MenubarItem onSelect={onFitView}>
            <Maximize2 className="mr-2 h-4 w-4" />
            适应视图
          </MenubarItem>
        )}
        {(onCollapseNodes || onExpandNodes) && (onZoomIn || onZoomOut || onFitView) && (
          <MenubarSeparator />
        )}
        {onCollapseNodes && (
          <MenubarItem onSelect={onCollapseNodes}>
            <Minimize2 className="mr-2 h-4 w-4" />
            折叠节点
            <MenubarShortcut>⌘⇧C</MenubarShortcut>
          </MenubarItem>
        )}
        {onExpandNodes && (
          <MenubarItem onSelect={onExpandNodes}>
            <Maximize2 className="mr-2 h-4 w-4" />
            展开节点
            <MenubarShortcut>⌘⇧E</MenubarShortcut>
          </MenubarItem>
        )}
      </MenubarContent>
    </MenubarMenu>
  )
}
