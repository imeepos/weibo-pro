import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@sker/ui/components/ui/dialog'
import { Badge } from '@sker/ui/components/ui/badge'
import { Separator } from '@sker/ui/components/ui/separator'
import { ScrollArea } from '@sker/ui/components/ui/scroll-area'
import type { INode, CompiledNodeMetadata, INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'
import { Info, Box, ArrowRight, ArrowLeft, Settings, AlertTriangle } from 'lucide-react'

interface NodeInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: INode | null
}

/**
 * NodeInfoDialog - 显示节点详细信息
 *
 * 展示节点元数据、输入端口、输出端口等信息
 */
export function NodeInfoDialog({ open, onOpenChange, node }: NodeInfoDialogProps) {
  if (!node) return null

  const metadata = node.metadata
  if (!metadata) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>节点信息</DialogTitle>
            <DialogDescription>此节点暂无元数据信息</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg text-primary-foreground"
              style={{ backgroundColor: node.color || '#3b82f6' }}
            >
              <Box className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{node.name || metadata.class.title || node.type}</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {metadata.class.type || '节点'} • {node.type}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-6 pr-4">
            {/* 基本信息 */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">基本信息</h3>
              </div>
              <div className="space-y-2 text-sm">
                {node.description && (
                  <div className="flex">
                    <span className="text-muted-foreground w-20 shrink-0">描述</span>
                    <span className="flex-1">{node.description}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="text-muted-foreground w-20 shrink-0">节点 ID</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{node.id}</code>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-20 shrink-0">状态</span>
                  <Badge variant={node.state === 'success' ? 'default' : node.state === 'fail' ? 'destructive' : 'secondary'}>
                    {node.state}
                  </Badge>
                </div>
                {node.emitCount > 0 && (
                  <div className="flex">
                    <span className="text-muted-foreground w-20 shrink-0">发射次数</span>
                    <span>{node.emitCount}</span>
                  </div>
                )}
                {node.error && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">错误</span>
                    <div className="flex-1 text-destructive">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs font-medium">{node.error.message || '未知错误'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* 输入端口 */}
            {metadata.inputs.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">输入端口 ({metadata.inputs.length})</h3>
                </div>
                <div className="space-y-2">
                  {metadata.inputs.map((input, index) => (
                    <InputPortItem key={index} port={input} />
                  ))}
                </div>
              </section>
            )}

            {metadata.inputs.length > 0 && metadata.outputs.length > 0 && <Separator />}

            {/* 输出端口 */}
            {metadata.outputs.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">输出端口 ({metadata.outputs.length})</h3>
                </div>
                <div className="space-y-2">
                  {metadata.outputs.map((output, index) => (
                    <OutputPortItem key={index} port={output} />
                  ))}
                </div>
              </section>
            )}

            <Separator />

            {/* 节点配置 */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">节点配置</h3>
              </div>
              <div className="space-y-2 text-sm">
                {metadata.class.errorStrategy && (
                  <div className="flex">
                    <span className="text-muted-foreground w-28 shrink-0">错误策略</span>
                    <Badge variant="outline">{metadata.class.errorStrategy}</Badge>
                  </div>
                )}
                {metadata.class.maxRetries !== undefined && metadata.class.errorStrategy === 'retry' && (
                  <div className="flex">
                    <span className="text-muted-foreground w-28 shrink-0">最大重试</span>
                    <span>{metadata.class.maxRetries} 次</span>
                  </div>
                )}
                {metadata.class.stateful !== undefined && (
                  <div className="flex">
                    <span className="text-muted-foreground w-28 shrink-0">有状态</span>
                    <Badge variant={metadata.class.stateful ? 'default' : 'outline'}>
                      {metadata.class.stateful ? '是' : '否'}
                    </Badge>
                  </div>
                )}
                {metadata.class.hasTool !== undefined && (
                  <div className="flex">
                    <span className="text-muted-foreground w-28 shrink-0">工具调用</span>
                    <Badge variant={metadata.class.hasTool ? 'default' : 'outline'}>
                      {metadata.class.hasTool ? '支持' : '不支持'}
                    </Badge>
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// 输入端口项
function InputPortItem({ port }: { port: INodeInputMetadata }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{port.title || port.property}</span>
          {port.required && <Badge variant="destructive" className="text-xs px-1.5 py-0">必填</Badge>}
          {!port.isStatic && <Badge variant="outline" className="text-xs px-1.5 py-0">动态</Badge>}
        </div>
        {port.description && (
          <p className="text-xs text-muted-foreground mt-1">{port.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          <span>类型: {port.type || 'any'}</span>
          {port.mode !== undefined && port.mode > 0 && (
            <span>模式: {port.mode === 1 ? '多输入' : port.mode === 16 ? '缓冲' : '多输入+缓冲'}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// 输出端口项
function OutputPortItem({ port }: { port: INodeOutputMetadata }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{port.title || port.property}</span>
          {port.isRouter && <Badge variant="secondary" className="text-xs px-1.5 py-0">路由</Badge>}
          {port.dynamic && <Badge variant="outline" className="text-xs px-1.5 py-0">动态</Badge>}
        </div>
        {port.description && (
          <p className="text-xs text-muted-foreground mt-1">{port.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          <span>类型: {port.type || 'any'}</span>
        </div>
      </div>
    </div>
  )
}
