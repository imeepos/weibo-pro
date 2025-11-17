import { Ast } from '../ast';
import { Visitor } from '../visitor';
import { NoRetryError } from '../errors';

export interface ExecutionCapability {
  canExecuteLocally: boolean;
  requiresAPI: boolean;
  capabilities: string[];
}

export interface ExecutionContext {
  apiBaseUrl?: string;
  authToken?: string;
  useLocalExecution?: boolean;
}

export class ExecutionCapabilityDetector {
  static detectCapability(ast: Ast): ExecutionCapability {
    const astType = ast.type;

    // A类节点：必须通过API调用执行
    const apiRequiredNodes = [
      'WeiboKeywordSearchAst',
      'WeiboAjaxStatusesShowAst',
      'WeiboAjaxFeedHotTimelineAst',
      'WeiboAjaxFriendshipsAst',
      'WeiboAjaxProfileInfoAst',
      'WeiboAjaxStatusesCommentAst',
      'WeiboAjaxStatusesLikeShowAst',
      'WeiboAjaxStatusesMymblogAst',
      'WeiboAjaxStatusesRepostTimelineAst',
      'PostNLPAnalyzerAst',
      'EventAutoCreatorAst',
      'PostContextCollectorAst',
      'BatchPushToMQAst',
      'WeiboLoginAst'
    ];

    // B类节点：可在浏览器端本地执行
    const localExecutableNodes = [
      'WorkflowGraphAst',
      'ArrayIteratorAst',
      'TestFormAst'
    ];

    if (apiRequiredNodes.includes(astType)) {
      return {
        canExecuteLocally: false,
        requiresAPI: true,
        capabilities: ['api-execution']
      };
    }

    if (localExecutableNodes.includes(astType)) {
      return {
        canExecuteLocally: true,
        requiresAPI: false,
        capabilities: ['local-execution']
      };
    }

    // 默认情况：优先使用API，但允许降级到本地执行
    return {
      canExecuteLocally: true,
      requiresAPI: false,
      capabilities: ['api-execution', 'local-execution']
    };
  }
}

export class APIVisitorExecutor implements Visitor {
  constructor(
    private apiBaseUrl: string = '/api',
    private authToken?: string
  ) {}

  async visit(ast: Ast, ctx: any): Promise<any> {
    const capability = ExecutionCapabilityDetector.detectCapability(ast);

    if (!capability.requiresAPI && !capability.capabilities.includes('api-execution')) {
      throw new Error(`AST ${ast.type} does not support API execution`);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/workflow/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
        },
        body: JSON.stringify({
          ast: ast,
          context: ctx
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API execution failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof NoRetryError) {
        ast.state = 'fail';
        ast.setError(error);
        return ast;
      }

      ast.state = 'fail';
      ast.setError(error);
      return ast;
    }
  }
}

export class LocalVisitorExecutor implements Visitor {
  private localHandlers = new Map<string, (ast: Ast, ctx: any) => Promise<any>>();

  constructor() {
    this.registerLocalHandlers();
  }

  private registerLocalHandlers(): void {
    // 注册可在浏览器端本地执行的节点处理器
    this.localHandlers.set('WorkflowGraphAst', this.handleWorkflowGraph.bind(this));
    this.localHandlers.set('ArrayIteratorAst', this.handleArrayIterator.bind(this));
    this.localHandlers.set('TestFormAst', this.handleTestForm.bind(this));
  }

  async visit(ast: Ast, ctx: any): Promise<any> {
    const capability = ExecutionCapabilityDetector.detectCapability(ast);

    if (!capability.canExecuteLocally) {
      throw new Error(`AST ${ast.type} cannot be executed locally in browser`);
    }

    const handler = this.localHandlers.get(ast.type);
    if (!handler) {
      throw new Error(`No local handler registered for AST type: ${ast.type}`);
    }

    try {
      return await handler(ast, ctx);
    } catch (error) {
      if (error instanceof NoRetryError) {
        ast.state = 'fail';
        ast.setError(error);
        return ast;
      }

      ast.state = 'fail';
      ast.setError(error);
      return ast;
    }
  }

  private async handleWorkflowGraph(ast: Ast, ctx: any): Promise<any> {
    // 工作流图节点在浏览器端主要作为容器，不执行实际逻辑
    ast.state = 'success';
    return ast;
  }

  private async handleArrayIterator(ast: Ast, ctx: any): Promise<any> {
    // 数组迭代器在浏览器端执行简单的数组遍历
    const { items = [], currentIndex = 0 } = ast as any;

    if (currentIndex >= items.length) {
      ast.state = 'success';
      return ast;
    }

    // 更新当前索引
    (ast as any).currentIndex = currentIndex + 1;
    ast.state = 'running';

    return ast;
  }

  private async handleTestForm(ast: Ast, ctx: any): Promise<any> {
    // 测试表单节点在浏览器端执行简单的表单验证
    const { formData = {} } = ast as any;

    // 简单的必填字段验证
    const requiredFields = ['name', 'email'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      ast.state = 'fail';
      ast.setError(new Error(`Missing required fields: ${missingFields.join(', ')}`));
      return ast;
    }

    ast.state = 'success';
    return ast;
  }
}

export class BrowserVisitorExecutor implements Visitor {
  private apiExecutor: APIVisitorExecutor;
  private localExecutor: LocalVisitorExecutor;

  constructor(
    apiBaseUrl?: string,
    authToken?: string,
    private fallbackToLocal: boolean = true
  ) {
    this.apiExecutor = new APIVisitorExecutor(apiBaseUrl, authToken);
    this.localExecutor = new LocalVisitorExecutor();
  }

  async visit(ast: Ast, ctx: any): Promise<any> {
    const capability = ExecutionCapabilityDetector.detectCapability(ast);

    // 优先尝试API执行
    if (capability.requiresAPI || capability.capabilities.includes('api-execution')) {
      try {
        return await this.apiExecutor.visit(ast, ctx);
      } catch (apiError) {
        // API执行失败时，如果允许降级且节点支持本地执行，则尝试本地执行
        if (this.fallbackToLocal && capability.canExecuteLocally) {
          console.warn(`API execution failed for ${ast.type}, falling back to local execution:`, apiError);
          return await this.localExecutor.visit(ast, ctx);
        }
        throw apiError;
      }
    }

    // 对于支持本地执行的节点，直接使用本地执行器
    if (capability.canExecuteLocally) {
      return await this.localExecutor.visit(ast, ctx);
    }

    throw new Error(`Cannot execute AST ${ast.type} in browser environment`);
  }
}

export const createBrowserVisitorExecutor = (
  apiBaseUrl?: string,
  authToken?: string,
  fallbackToLocal: boolean = true
): BrowserVisitorExecutor => {
  return new BrowserVisitorExecutor(apiBaseUrl, authToken, fallbackToLocal);
};