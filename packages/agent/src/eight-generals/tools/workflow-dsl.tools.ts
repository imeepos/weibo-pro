import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getAllNodeTypes, findNodeType, NODE } from '@sker/workflow';
import { compile } from '@sker/workflow-compiler';
import { root } from '@sker/core';

/**
 * 列出所有可用的工作流节点类型
 */
export const listAvailableNodesTool = tool(
  async ({ category }) => {
    try {
      const allNodes = getAllNodeTypes();

      const filtered = category && category !== 'all'
        ? allNodes.filter((node: any) => {
            const name = node.name.toLowerCase();
            if (category === 'data-sources') return name.includes('login') || name.includes('search') || name.includes('http');
            if (category === 'ai-capabilities') return name.includes('llm') || name.includes('agent') || name.includes('generator');
            if (category === 'data-processing') return name.includes('analyzer') || name.includes('filter') || name.includes('transform');
            return true;
          })
        : allNodes;

      const result = filtered.map((node: any) => {
        const metadata = root.get(NODE, []).find((m: any) => m.target === node);
        return {
          name: node.name,
          title: metadata?.title || node.name,
          type: metadata?.type || 'unknown',
          description: '无描述'
        };
      });

      return JSON.stringify(result, null, 2);
    } catch (error) {
      return `获取节点列表失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'list_available_nodes',
    description: '列出所有可用的工作流节点类型，可按类别筛选',
    schema: z.object({
      category: z.enum(['data-sources', 'ai-capabilities', 'data-processing', 'all'])
        .optional()
        .default('all')
        .describe('节点类别筛选'),
    }),
  }
);

/**
 * 获取指定节点类型的输入输出 Schema
 */
export const getNodeSchemaTool = tool(
  async ({ nodeType }) => {
    try {
      const NodeClass = findNodeType(nodeType);
      if (!NodeClass) {
        return `未找到节点类型: ${nodeType}`;
      }

      const instance = new NodeClass();
      const metadata = Reflect.getMetadata('node:metadata', NodeClass) || {};
      const inputs = Reflect.getMetadata('node:inputs', NodeClass.prototype) || [];
      const outputs = Reflect.getMetadata('node:outputs', NodeClass.prototype) || [];

      const result = {
        name: nodeType,
        title: metadata.title || nodeType,
        description: metadata.description || '无描述',
        inputs: inputs.map((input: any) => ({
          name: input.propertyKey,
          type: input.type || 'any',
          required: input.required !== false,
          description: input.description || ''
        })),
        outputs: outputs.map((output: any) => ({
          name: output.propertyKey,
          type: output.type || 'any',
          description: output.description || ''
        }))
      };

      return JSON.stringify(result, null, 2);
    } catch (error) {
      return `获取节点 Schema 失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: 'get_node_schema',
    description: '获取指定节点类型的输入输出 Schema 定义',
    schema: z.object({
      nodeType: z.string().describe('节点类名（如 WeiboLoginAst）'),
    }),
  }
);

/**
 * 验证 DSL 代码
 */
export const validateDSLTool = tool(
  async ({ dslCode }) => {
    try {
      const result = compile(dslCode);

      if (result.success) {
        return JSON.stringify({
          valid: true,
          nodeCount: result.workflowGraph?.nodes.length || 0,
          edgeCount: result.workflowGraph?.edges.length || 0,
          message: 'DSL 验证通过'
        }, null, 2);
      } else {
        return JSON.stringify({
          valid: false,
          errors: result.errors?.map((err: any) => ({
            message: err.message,
            line: err.line,
            column: err.column,
            severity: err.severity
          })) || []
        }, null, 2);
      }
    } catch (error) {
      return JSON.stringify({
        valid: false,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
          severity: 'error'
        }]
      }, null, 2);
    }
  },
  {
    name: 'validate_dsl',
    description: '验证工作流 DSL 代码的语法和语义',
    schema: z.object({
      dslCode: z.string().describe('要验证的 DSL 代码'),
    }),
  }
);

/**
 * 编译 DSL 代码为可执行工作流
 */
export const compileDSLTool = tool(
  async ({ dslCode }) => {
    try {
      const result = compile(dslCode);

      if (result.success && result.workflowGraph) {
        return JSON.stringify({
          success: true,
          workflowName: result.dslAst?.name || 'Unnamed Workflow',
          nodeCount: result.workflowGraph.nodes.length,
          edgeCount: result.workflowGraph.edges.length,
          nodes: result.workflowGraph.nodes.map((node: any) => ({
            id: node.id,
            type: node.constructor.name,
            position: node.position
          })),
          message: '编译成功'
        }, null, 2);
      } else {
        return JSON.stringify({
          success: false,
          errors: result.errors?.map((err: any) => ({
            message: err.message,
            line: err.line,
            column: err.column,
            severity: err.severity
          })) || [],
          message: '编译失败'
        }, null, 2);
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
          severity: 'error'
        }],
        message: '编译异常'
      }, null, 2);
    }
  },
  {
    name: 'compile_dsl',
    description: '编译工作流 DSL 代码为可执行的 WorkflowGraphAst',
    schema: z.object({
      dslCode: z.string().describe('要编译的 DSL 代码'),
    }),
  }
);

/** 导出所有工作流 DSL 工具 */
export const workflowDSLTools = [
  listAvailableNodesTool,
  getNodeSchemaTool,
  validateDSLTool,
  compileDSLTool,
];
