import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from '@sker/ui/components/ui/menubar'
import { useState } from 'react'

const meta = {
  title: '@sker/ui/ui/Menubar',
  component: Menubar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Menubar>

export default meta
type Story = StoryObj<ReactRenderer>

export const Basic: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>文件</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>新建工作流</MenubarItem>
          <MenubarItem>打开</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>保存</MenubarItem>
          <MenubarItem>另存为</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>编辑</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>撤销</MenubarItem>
          <MenubarItem>重做</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
}

export const WithShortcuts: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>文件</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            新建 <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            打开 <MenubarShortcut>⌘O</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            保存 <MenubarShortcut>⌘S</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>编辑</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            撤销 <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            重做 <MenubarShortcut>⌘⇧Z</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
}

export const WithCheckbox: Story = {
  render: () => {
    const [showPanel, setShowPanel] = useState(true)
    const [showToolbar, setShowToolbar] = useState(false)
    return (
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>视图</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked={showPanel} onCheckedChange={setShowPanel}>
              显示侧边栏
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={showToolbar} onCheckedChange={setShowToolbar}>
              显示工具栏
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )
  },
}

export const WithRadio: Story = {
  render: () => {
    const [layout, setLayout] = useState('grid')
    return (
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>布局</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={layout} onValueChange={setLayout}>
              <MenubarRadioItem value="grid">网格视图</MenubarRadioItem>
              <MenubarRadioItem value="list">列表视图</MenubarRadioItem>
              <MenubarRadioItem value="timeline">时间线视图</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )
  },
}

export const WithSubmenu: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>工作流</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>新建工作流</MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>导入</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>从文件导入</MenubarItem>
              <MenubarItem>从模板导入</MenubarItem>
              <MenubarItem>从 URL 导入</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>导出</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>导出为 JSON</MenubarItem>
              <MenubarItem>导出为 YAML</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
}

export const Complete: Story = {
  render: () => {
    const [showPanel, setShowPanel] = useState(true)
    const [view, setView] = useState('grid')
    return (
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>文件</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              新建工作流 <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              打开 <MenubarShortcut>⌘O</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              保存 <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem variant="destructive">删除</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>视图</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked={showPanel} onCheckedChange={setShowPanel}>
              侧边栏
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarRadioGroup value={view} onValueChange={setView}>
              <MenubarRadioItem value="grid">网格</MenubarRadioItem>
              <MenubarRadioItem value="list">列表</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>工具</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>数据采集</MenubarItem>
            <MenubarItem>NLP 分析</MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>Agent</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>研究 Agent</MenubarItem>
                <MenubarItem>舆情 Agent</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>操作</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>可用操作</MenubarItem>
          <MenubarItem disabled>已禁用操作</MenubarItem>
          <MenubarItem>另一个操作</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
}
