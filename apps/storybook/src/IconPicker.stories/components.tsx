import { IconPicker } from '@sker/ui/components/ui/icon-picker'
import { Button } from '@sker/ui/components/ui/button'
import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { limitedIcons } from './data'

/** 根据名称渲染 Lucide 图标 */
export const IconPreview = ({ name, className }: { name: string; className?: string }) => {
  const Icon = LucideIcons[name as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>
  return <Icon className={className} />
}

export const DefaultRender = () => {
  const [icon, setIcon] = useState('Star')
  return <IconPicker value={icon} onValueChange={setIcon} />
}

export const WithoutInitialValueRender = () => {
  const [icon, setIcon] = useState<string>()
  return <IconPicker value={icon} onValueChange={setIcon} />
}

export const WithCustomTriggerRender = () => {
  const [icon, setIcon] = useState('Heart')
  return (
    <IconPicker value={icon} onValueChange={setIcon}>
      <Button variant="ghost">
        {icon ? (
          <>
            <IconPreview name={icon} className="size-4" />
            选择图标
          </>
        ) : (
          '选择图标'
        )}
      </Button>
    </IconPicker>
  )
}

export const WithCustomPlaceholderRender = () => {
  const [icon, setIcon] = useState<string>()
  return (
    <IconPicker
      value={icon}
      onValueChange={setIcon}
      searchPlaceholder="输入图标名称..."
      emptyText="没有找到匹配的图标"
    />
  )
}

export const LimitedIconsRender = () => {
  const [icon, setIcon] = useState('Zap')
  return (
    <IconPicker
      value={icon}
      onValueChange={setIcon}
      icons={limitedIcons}
    />
  )
}

export const WithCustomTriggerStyleRender = () => {
  const [icon, setIcon] = useState('Sparkles')
  return (
    <IconPicker
      value={icon}
      onValueChange={setIcon}
      triggerClassName="w-64"
    />
  )
}
