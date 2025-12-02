import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { IconPicker } from '@sker/ui/components/ui/icon-picker'
import { Button } from '@sker/ui/components/ui/button'
import { Card } from '@sker/ui/components/ui/card'
import { useState } from 'react'
import * as LucideIcons from 'lucide-react'

const meta = {
  title: 'UI/IconPicker',
  component: IconPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof IconPicker>

export default meta
type Story = StoryObj<ReactRenderer>

export const Default: Story = {
  render: () => {
    const [icon, setIcon] = useState('Star')
    return <IconPicker value={icon} onValueChange={setIcon} />
  },
}

export const WithoutInitialValue: Story = {
  render: () => {
    const [icon, setIcon] = useState<string>()
    return <IconPicker value={icon} onValueChange={setIcon} />
  },
}

export const WithCustomTrigger: Story = {
  render: () => {
    const [icon, setIcon] = useState('Heart')
    return (
      <IconPicker value={icon} onValueChange={setIcon}>
        <Button variant="ghost">
          {icon ? (
            <>
              {(() => {
                const Icon = LucideIcons[
                  icon as keyof typeof LucideIcons
                ] as React.ComponentType<{ className?: string }>
                return <Icon className="size-4" />
              })()}
              选择图标
            </>
          ) : (
            '选择图标'
          )}
        </Button>
      </IconPicker>
    )
  },
}

export const WithCustomPlaceholder: Story = {
  render: () => {
    const [icon, setIcon] = useState<string>()
    return (
      <IconPicker
        value={icon}
        onValueChange={setIcon}
        searchPlaceholder="输入图标名称..."
        emptyText="没有找到匹配的图标"
      />
    )
  },
}

export const LimitedIcons: Story = {
  render: () => {
    const [icon, setIcon] = useState('Zap')
    const limitedIcons = [
      'Star',
      'Heart',
      'Trash2',
      'Check',
      'X',
      'Settings',
      'User',
      'Mail',
      'Bell',
      'Search',
      'Home',
      'Calendar',
      'Clock',
      'Edit',
      'Save',
      'Download',
      'Upload',
      'FileText',
      'Folder',
      'Image',
      'Video',
      'Music',
      'Code',
      'Database',
      'Server',
      'Cloud',
      'Lock',
      'Unlock',
      'Eye',
      'EyeOff',
      'ThumbsUp',
      'Share',
      'Send',
      'MessageCircle',
      'Phone',
      'Wifi',
      'Battery',
      'Power',
      'Zap',
      'TrendingUp',
      'Award',
      'Target',
      'Filter',
      'Layout',
      'Grid',
      'List',
      'Tag',
      'Flag',
      'Bookmark',
    ]
    return (
      <IconPicker
        value={icon}
        onValueChange={setIcon}
        icons={limitedIcons}
      />
    )
  },
}

export const WithCustomTriggerStyle: Story = {
  render: () => {
    const [icon, setIcon] = useState('Sparkles')
    return (
      <IconPicker
        value={icon}
        onValueChange={setIcon}
        triggerClassName="w-64"
      />
    )
  },
}

export const InForm: Story = {
  render: () => {
    const [icon, setIcon] = useState('Activity')
    return (
      <Card className="w-96 p-6">
        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">节点名称</label>
            <input
              type="text"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="请输入节点名称"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">节点图标</label>
            <IconPicker value={icon} onValueChange={setIcon} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">节点描述</label>
            <textarea
              className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="请输入节点描述"
            />
          </div>
          <Button type="submit" className="w-full">
            保存配置
          </Button>
        </form>
      </Card>
    )
  },
}

export const MultipleInstances: Story = {
  render: () => {
    const [primaryIcon, setPrimaryIcon] = useState('Workflow')
    const [secondaryIcon, setSecondaryIcon] = useState('Database')
    const [tertiaryIcon, setTertiaryIcon] = useState('Rocket')

    return (
      <Card className="w-96 p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">主要图标</label>
            <IconPicker value={primaryIcon} onValueChange={setPrimaryIcon} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">次要图标</label>
            <IconPicker
              value={secondaryIcon}
              onValueChange={setSecondaryIcon}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">额外图标</label>
            <IconPicker value={tertiaryIcon} onValueChange={setTertiaryIcon} />
          </div>
          <div className="mt-6 rounded-md border p-4">
            <h4 className="mb-3 text-sm font-medium">预览</h4>
            <div className="flex items-center gap-3">
              {(() => {
                const PrimaryIcon = LucideIcons[
                  primaryIcon as keyof typeof LucideIcons
                ] as React.ComponentType<{ className?: string }>
                const SecondaryIcon = LucideIcons[
                  secondaryIcon as keyof typeof LucideIcons
                ] as React.ComponentType<{ className?: string }>
                const TertiaryIcon = LucideIcons[
                  tertiaryIcon as keyof typeof LucideIcons
                ] as React.ComponentType<{ className?: string }>

                return (
                  <>
                    <div className="flex items-center gap-2">
                      <PrimaryIcon className="size-6 text-primary" />
                      <span className="text-sm">{primaryIcon}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SecondaryIcon className="size-6 text-secondary-foreground" />
                      <span className="text-sm">{secondaryIcon}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TertiaryIcon className="size-6 text-muted-foreground" />
                      <span className="text-sm">{tertiaryIcon}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </Card>
    )
  },
}

export const WorkflowNodeConfig: Story = {
  render: () => {
    const [icon, setIcon] = useState('MessageSquare')
    const [nodeType, setNodeType] = useState('WeiboKeywordSearchAst')

    return (
      <Card className="w-[480px] p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">工作流节点配置</h3>
            <p className="text-sm text-muted-foreground">
              自定义工作流节点的外观和行为
            </p>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">节点类型</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={nodeType}
                  onChange={(e) => setNodeType(e.target.value)}
                >
                  <option>WeiboKeywordSearchAst</option>
                  <option>WeiboAjaxStatusesShowAst</option>
                  <option>PostNLPAnalyzerAst</option>
                  <option>EventAutoCreatorAst</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">节点图标</label>
                <IconPicker value={icon} onValueChange={setIcon} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">节点标题</label>
              <input
                type="text"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                placeholder="微博关键词搜索"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">节点描述</label>
              <textarea
                className="min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="通过关键词搜索微博内容"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-3 text-sm font-semibold">预览效果</h4>
            <div className="rounded-md border bg-background p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {(() => {
                  const Icon = LucideIcons[
                    icon as keyof typeof LucideIcons
                  ] as React.ComponentType<{ className?: string }>
                  return (
                    <div className="rounded-md bg-primary/10 p-2">
                      <Icon className="size-5 text-primary" />
                    </div>
                  )
                })()}
                <div className="flex-1">
                  <h5 className="font-medium">{nodeType}</h5>
                  <p className="text-xs text-muted-foreground">
                    通过关键词搜索微博内容
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1">保存配置</Button>
            <Button variant="outline" className="flex-1">
              重置
            </Button>
          </div>
        </div>
      </Card>
    )
  },
}

export const InteractiveDemo: Story = {
  render: () => {
    const [selectedIcon, setSelectedIcon] = useState('Sparkles')
    const [iconSize, setIconSize] = useState('6')
    const [iconColor, setIconColor] = useState('text-primary')

    return (
      <Card className="w-[480px] p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">图标选择器演示</h3>
            <p className="text-sm text-muted-foreground">
              实时预览图标选择效果
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择图标</label>
              <IconPicker
                value={selectedIcon}
                onValueChange={setSelectedIcon}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">图标大小</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={iconSize}
                  onChange={(e) => setIconSize(e.target.value)}
                >
                  <option value="4">小 (16px)</option>
                  <option value="6">中 (24px)</option>
                  <option value="8">大 (32px)</option>
                  <option value="12">特大 (48px)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">图标颜色</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={iconColor}
                  onChange={(e) => setIconColor(e.target.value)}
                >
                  <option value="text-primary">主色</option>
                  <option value="text-secondary-foreground">次要</option>
                  <option value="text-muted-foreground">柔和</option>
                  <option value="text-destructive">警告</option>
                  <option value="text-green-600">成功</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-background p-6 shadow-lg">
                {(() => {
                  const Icon = LucideIcons[
                    selectedIcon as keyof typeof LucideIcons
                  ] as React.ComponentType<{ className?: string }>
                  return <Icon className={`size-${iconSize} ${iconColor}`} />
                })()}
              </div>
              <div className="text-center">
                <p className="font-medium">{selectedIcon}</p>
                <p className="text-xs text-muted-foreground">
                  size-{iconSize} · {iconColor}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  },
}
