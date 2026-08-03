'use client'

import React from 'react'
import { FileText, SaveIcon, UploadIcon, Download, FileCode, SettingsIcon } from 'lucide-react'
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@sker/ui/components/ui/menubar'
import type { WorkflowMenubarProps } from './workflow-menubar-types'

export interface FileMenuProps
  extends Pick<
    WorkflowMenubarProps,
    'onSave' | 'isSaving' | 'onImport' | 'onExport' | 'onAiExport' | 'onSettings'
  > {}

export function FileMenu({
  onSave,
  isSaving,
  onImport,
  onExport,
  onAiExport,
  onSettings,
}: FileMenuProps) {
  if (!(onSave || onImport || onExport || onAiExport || onSettings)) return null

  return (
    <MenubarMenu>
      <MenubarTrigger>
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        文件
      </MenubarTrigger>
      <MenubarContent>
        {onSave && (
          <MenubarItem onSelect={onSave} disabled={isSaving}>
            <SaveIcon className="mr-2 h-4 w-4" />
            {isSaving ? '保存中...' : '保存工作流'}
            <MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
        )}
        {onImport && (
          <MenubarItem onSelect={onImport}>
            <UploadIcon className="mr-2 h-4 w-4" />
            导入工作流
          </MenubarItem>
        )}
        {onExport && (
          <MenubarItem onSelect={onExport}>
            <Download className="mr-2 h-4 w-4" />
            导出工作流
          </MenubarItem>
        )}
        {onAiExport && (
          <MenubarItem onSelect={onAiExport}>
            <FileCode className="mr-2 h-4 w-4" />
            导出AI分析格式
          </MenubarItem>
        )}
        {onSettings && (onSave || onImport || onExport || onAiExport) && <MenubarSeparator />}
        {onSettings && (
          <MenubarItem onSelect={onSettings}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            工作流设置
          </MenubarItem>
        )}
      </MenubarContent>
    </MenubarMenu>
  )
}
