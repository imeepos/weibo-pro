import React, { useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { WorkflowSummary } from '@sker/sdk'
import { Dialog, DialogContent } from '../ui/dialog'
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '../ui/command'
import { cn } from '@sker/ui/lib/utils'

interface WorkflowSelectorProps {
  workflows: WorkflowSummary[]
  selectedId?: string
  onSelect: (workflow: WorkflowSummary) => void
  placeholder?: string
  emptyText?: string
  label?: string
}

export function WorkflowSelector({
  workflows,
  selectedId,
  onSelect,
  placeholder = '点击选择工作流...',
  emptyText = '未找到工作流',
  label = '选择工作流'
}: WorkflowSelectorProps) {
  const [open, setOpen] = useState(false)
  const selected = workflows.find(w => w.id === selectedId)

  const handleSelect = (workflow: WorkflowSummary) => {
    onSelect(workflow)
    setOpen(false)
  }

  return (
    <div>
      {label && <label className="text-sm text-muted-foreground mb-2 block">{label}</label>}

      <div className="relative">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-muted/50"
        >
          <span className={selected ? '' : 'text-muted-foreground'}>
            {selected ? (
              <span>
                {selected.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  (更新于 {formatDistanceToNow(new Date(selected.updatedAt), { addSuffix: true, locale: zhCN })})
                </span>
              </span>
            ) : placeholder}
          </span>
          <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md p-0">
            <Command className="rounded-lg border">
              <CommandInput placeholder="搜索工作流..." />
              <CommandList className="max-h-[400px]">
                <CommandEmpty>{emptyText}</CommandEmpty>
                {workflows.map(workflow => (
                  <CommandItem
                    key={workflow.id}
                    value={`${workflow.name} ${workflow.id}`}
                    onSelect={() => handleSelect(workflow)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{workflow.name}</div>
                      <div className="text-xs text-muted-foreground">
                        创建于 {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true, locale: zhCN })}
                      </div>
                    </div>
                    {selectedId === workflow.id && (
                      <CheckIcon className="size-4 ml-2 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
