"use client"

import * as React from "react"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
export interface DynamicOutput {
  property: string      // 属性名（如 output_case4）
  title: string         // 显示标题
  condition: string     // 条件表达式
}
export interface DynamicOutputsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outputs: DynamicOutput[]
  onSave: (outputs: DynamicOutput[]) => void
}

export function DynamicOutputsDialog({
  open,
  onOpenChange,
  outputs,
  onSave
}: DynamicOutputsDialogProps) {
  const [localOutputs, setLocalOutputs] = React.useState<DynamicOutput[]>(outputs)

  // 当传入的 outputs 变化时，同步本地状态
  React.useEffect(() => {
    setLocalOutputs(outputs)
  }, [outputs])

  const handleAdd = () => {
    const newOutput: DynamicOutput = {
      property: `output_case${localOutputs.length + 1}`,
      title: `Case ${localOutputs.length + 1}`,
      condition: 'true'
    }
    setLocalOutputs([...localOutputs, newOutput])
  }

  const handleRemove = (index: number) => {
    setLocalOutputs(localOutputs.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof DynamicOutput, value: string) => {
    setLocalOutputs(localOutputs.map((output, i) =>
      i === index ? { ...output, [field]: value } : output
    ))
  }

  const handleSave = () => {
    onSave(localOutputs)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalOutputs(outputs) // 恢复原始值
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>配置动态输出</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {localOutputs.map((output, index) => (
            <div key={index} className="grid gap-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">输出 #{index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="h-8 w-8 p-0"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`property-${index}`}>属性名</Label>
                <Input
                  id={`property-${index}`}
                  value={output.property}
                  onChange={(e) => handleChange(index, 'property', e.target.value)}
                  placeholder="output_case1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`title-${index}`}>显示标题</Label>
                <Input
                  id={`title-${index}`}
                  value={output.title}
                  onChange={(e) => handleChange(index, 'title', e.target.value)}
                  placeholder="Case 1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`condition-${index}`}>条件表达式</Label>
                <Input
                  id={`condition-${index}`}
                  value={output.condition}
                  onChange={(e) => handleChange(index, 'condition', e.target.value)}
                  placeholder="$input === 1"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  使用 $input 引用输入值，例如：$input === 1 或 $input {'>'} 10
                </p>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={handleAdd}
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            添加输出
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
