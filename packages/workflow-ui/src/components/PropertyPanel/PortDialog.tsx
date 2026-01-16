'use client'

import React, { useState, useEffect } from 'react'
import { Settings, AlertCircle } from 'lucide-react'
import { INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'
import { cn } from '@sker/ui/lib/utils'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@sker/ui/components/ui/dialog'
import { Input } from '@sker/ui/components/ui/input'
import { Textarea } from '@sker/ui/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select'
import { Switch } from '@sker/ui/components/ui/switch'
import { Button } from '@sker/ui/components/ui/button'
import { Label } from '@sker/ui/components/ui/label'

export interface PortDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  portType: 'input' | 'output'
  initialValues?: Partial<INodeInputMetadata | INodeOutputMetadata>
  existingProperties: string[]
  onSave: (port: INodeInputMetadata | INodeOutputMetadata) => void
}

const INPUT_TYPES = ['string', 'text', 'number', 'boolean', 'date', 'select', 'image', 'video', 'audio', 'object', 'any'] as const
const OUTPUT_TYPES = ['string', 'number', 'boolean', 'object', 'array', 'any'] as const

const CONDITION_PRESETS = [
  { label: '等于', template: '$input === ' },
  { label: '不等于', template: '$input !== ' },
  { label: '大于', template: '$input > ' },
  { label: '小于', template: '$input < ' },
  { label: '包含', template: '$input.includes(' },
  { label: '默认', template: 'true' },
] as const

function validateProperty(
  property: string,
  existingProperties: string[],
  currentProperty?: string
): string | null {
  if (!property) {
    return '属性名不能为空'
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(property)) {
    return '属性名必须以字母开头，只能包含字母、数字、下划线'
  }

  const isDuplicate = existingProperties.some(
    p => p === property && p !== currentProperty
  )

  if (isDuplicate) {
    return '属性名已存在'
  }

  return null
}

export function PortDialog({
  open,
  onOpenChange,
  mode,
  portType,
  initialValues,
  existingProperties,
  onSave,
}: PortDialogProps) {
  const [property, setProperty] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('string')
  const [isRouter, setIsRouter] = useState(false)
  const [condition, setCondition] = useState('')
  const [required, setRequired] = useState(false)
  const [defaultValue, setDefaultValue] = useState('')

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setProperty(initialValues.property || '')
        setTitle(initialValues.title || '')
        setDescription(initialValues.description || '')
        setType(initialValues.type || 'string')
        setIsRouter('isRouter' in initialValues ? initialValues.isRouter || false : false)
        setCondition('condition' in initialValues ? initialValues.condition || '' : '')
        setRequired('required' in initialValues ? initialValues.required || false : false)
        setDefaultValue('defaultValue' in initialValues ? String(initialValues.defaultValue || '') : '')
      } else {
        setProperty('')
        setTitle('')
        setDescription('')
        setType('string')
        setIsRouter(false)
        setCondition('')
        setRequired(false)
        setDefaultValue('')
      }
    }
  }, [open, initialValues])

  const propertyError = validateProperty(
    property,
    existingProperties,
    mode === 'edit' ? initialValues?.property : undefined
  )

  const isFormValid = property && !propertyError && type

  const handleSave = () => {
    if (!isFormValid) return

    const basePort = {
      property,
      title,
      description,
      type,
      isStatic: false,
    }

    if (portType === 'input') {
      const inputPort: INodeInputMetadata = {
        ...basePort,
        required,
        ...(defaultValue && { defaultValue }),
      } as INodeInputMetadata
      onSave(inputPort)
    } else {
      const outputPort: INodeOutputMetadata = {
        ...basePort,
        isRouter,
        ...(condition && { condition }),
        ...(defaultValue && { defaultValue }),
      } as INodeOutputMetadata
      onSave(outputPort)
    }

    onOpenChange(false)
  }

  const applyPreset = (template: string) => {
    if (template === 'true') {
      setCondition('true')
    } else {
      setCondition(template)
    }
  }

  const availableTypes = portType === 'input' ? INPUT_TYPES : OUTPUT_TYPES

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <DialogTitle>{mode === 'add' ? '添加端口' : '编辑端口'}</DialogTitle>
              <DialogDescription>
                {portType === 'input' ? '配置输入端口属性' : '配置输出端口属性'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="property">
              属性名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="property"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              placeholder={portType === 'input' ? 'input_1' : 'output_1'}
              className={cn(propertyError && 'border-destructive')}
            />
            {propertyError ? (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {propertyError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {mode === 'edit' && property !== initialValues?.property && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" />
                    修改属性名可能影响已建立的连线
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              端口显示名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={portType === 'input' ? '输入端口' : '输出端口'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述（可选）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述此端口的用途"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              数据类型 <span className="text-destructive">*</span>
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="选择数据类型" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {portType === 'input' && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-accent/30 p-3">
              <div className="text-xs font-medium text-foreground">输入端口选项</div>

              <div className="flex items-center justify-between">
                <Label htmlFor="required" className="cursor-pointer">
                  必填
                </Label>
                <Switch
                  id="required"
                  checked={required}
                  onCheckedChange={setRequired}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultValue-input">默认值（可选）</Label>
                <Input
                  id="defaultValue-input"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder="默认值"
                />
              </div>
            </div>
          )}

          {portType === 'output' && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-accent/30 p-3">
              <div className="text-xs font-medium text-foreground">输出端口选项</div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isRouter" className="cursor-pointer">
                  路由输出
                </Label>
                <Switch
                  id="isRouter"
                  checked={isRouter}
                  onCheckedChange={setIsRouter}
                />
              </div>

              {isRouter && (
                <div className="space-y-2">
                  <Label>条件表达式（可选）</Label>
                  <div className="flex flex-wrap gap-1">
                    {CONDITION_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset.template)}
                        className={cn(
                          'h-6 px-2 text-[10px]',
                          condition === preset.template && 'bg-amber-500/20 border-amber-500/50'
                        )}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <Input
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="$input === 1"
                    className={cn(
                      'font-mono text-xs',
                      condition === 'true' && 'border-green-500/50'
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    使用 $input 引用输入值，如: $input === 1, $input {'>'} 10
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="defaultValue-output">默认值（可选）</Label>
                <Input
                  id="defaultValue-output"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder="默认值"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            保存配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
