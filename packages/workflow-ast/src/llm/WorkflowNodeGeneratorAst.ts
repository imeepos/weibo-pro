import { Ast, Input, Node, Output } from '@sker/workflow';

@Node({
  title: '工作流节点生成器',
  type: 'llm',
  errorStrategy: 'retry',
  maxRetries: 3,
  retryDelay: 2000,
  retryBackoff: 2
})
export class WorkflowNodeGeneratorAst extends Ast {
  @Input({ title: '节点功能描述', type: 'textarea', defaultValue: '' })
  nodeDescription: string = '';

  @Input({ title: '节点类型', type: 'select', defaultValue: 'basic' })
  nodeType: 'llm' | 'crawler' | 'control' | 'basic' | 'analysis' = 'basic';

  @Input({ title: '节点名称', type: 'text', defaultValue: '' })
  nodeName: string = '';

  @Input({ title: '模型', defaultValue: 'deepseek-ai/DeepSeek-V3.2' })
  model: string = 'deepseek-ai/DeepSeek-V3.2';

  @Output({ title: 'AST 代码', defaultValue: '' })
  astCode = '';

  @Output({ title: 'Visitor 代码', defaultValue: '' })
  visitorCode = '';

  @Output({ title: '生成成功', defaultValue: false })
  success = false;

  type = 'WorkflowNodeGeneratorAst';
}
