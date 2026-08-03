'use client'

import React from 'react'
import { LayoutGrid } from 'lucide-react'
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
} from '@sker/ui/components/ui/menubar'
import type { WorkflowMenubarProps } from './workflow-menubar-types'

export interface LayoutMenuProps
  extends Pick<WorkflowMenubarProps, 'onAutoLayout'> {}

export function LayoutMenu({ onAutoLayout }: LayoutMenuProps) {
  if (!onAutoLayout) return null

  return (
    <MenubarMenu>
      <MenubarTrigger>
        <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
        布局
      </MenubarTrigger>
      <MenubarContent>
        <MenubarItem onSelect={onAutoLayout}>
          <LayoutGrid className="mr-2 h-4 w-4" />
          自动布局
          <MenubarShortcut>⌘⇧L</MenubarShortcut>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  )
}
