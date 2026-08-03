'use client'

import React from 'react'
import { Edit3, Undo, Redo } from 'lucide-react'
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarShortcut,
  MenubarTrigger,
} from '@sker/ui/components/ui/menubar'
import type { WorkflowMenubarProps } from './workflow-menubar-types'

export interface EditMenuProps
  extends Pick<WorkflowMenubarProps, 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo'> {}

export function EditMenu({ onUndo, onRedo, canUndo = false, canRedo = false }: EditMenuProps) {
  if (!(onUndo || onRedo)) return null

  return (
    <MenubarMenu>
      <MenubarTrigger>
        <Edit3 className="mr-1.5 h-3.5 w-3.5" />
        编辑
      </MenubarTrigger>
      <MenubarContent>
        {onUndo && (
          <MenubarItem onSelect={onUndo} disabled={!canUndo}>
            <Undo className="mr-2 h-4 w-4" />
            撤销
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
        )}
        {onRedo && (
          <MenubarItem onSelect={onRedo} disabled={!canRedo}>
            <Redo className="mr-2 h-4 w-4" />
            重做
            <MenubarShortcut>⌘⇧Z</MenubarShortcut>
          </MenubarItem>
        )}
      </MenubarContent>
    </MenubarMenu>
  )
}
