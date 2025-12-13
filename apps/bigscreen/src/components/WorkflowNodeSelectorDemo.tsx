import React, { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { WorkflowController, type WorkflowNodeInfo } from '@sker/sdk';
import { WorkflowNodeSelector, type WorkflowNode } from '@sker/ui/components/blocks/workflow-node-selector';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { Spinner } from '@sker/ui/components/ui/spinner';

/**
 * 工作流节点选择器集成示例
 *
 * 存在即合理：展示如何在业务场景中集成节点选择器
 * 优雅即简约：使用 SDK + 组件的最佳实践
 */
export const WorkflowNodeSelectorDemo: React.FC = () => {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [selectedNodeType, setSelectedNodeType] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const workflowCtrl = root.get(WorkflowController);

  useEffect(() => {
    loadNodes();
  }, []);

  const loadNodes = async () => {
    setLoading(true);
    try {
      const nodeInfos = await workflowCtrl.getAvailableNodes();

      // 转换为选择器所需格式
      const workflowNodes: WorkflowNode[] = nodeInfos.map((info) => ({
        type: info.type,
        title: info.title,
        nodeType: info.nodeType as any,
        description: info.description,
      }));

      setNodes(workflowNodes);
    } catch (error) {
      console.error('加载节点失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeChange = (nodeType: string) => {
    setSelectedNodeType(nodeType);
    console.log('选中节点类型:', nodeType);

    // 在此处理节点选择后的业务逻辑
    // 例如：添加到工作流画布、显示配置面板等
  };

  const selectedNode = nodes.find((n) => n.type === selectedNodeType);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>工作流节点选择</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkflowNodeSelector
            nodes={nodes}
            value={selectedNodeType}
            onChange={handleNodeChange}
            open={selectorOpen}
            onOpenChange={setSelectorOpen}
            placeholder="搜索节点类型..."
          />

          {selectedNode && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3 text-card-foreground">
                节点详情
              </h3>
              <div className="grid gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-16">标题:</span>
                  <span className="font-medium">{selectedNode.title}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-16">类型:</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {selectedNode.type}
                  </code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-16">分类:</span>
                  <span className="text-xs rounded-full border px-2 py-0.5">
                    {selectedNode.nodeType}
                  </span>
                </div>
                {selectedNode.description && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground min-w-16">描述:</span>
                    <span className="text-muted-foreground">
                      {selectedNode.description}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            共 {nodes.length} 个可用节点类型
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
