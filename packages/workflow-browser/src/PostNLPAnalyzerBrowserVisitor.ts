import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'
import { Observable } from 'rxjs'

/**
 * 帖子 NLP 分析器浏览器端执行器
 */
@Injectable()
export class PostNLPAnalyzerBrowserVisitor {
  @Handler(PostNLPAnalyzerAst)
  handler(ast: PostNLPAnalyzerAst, ctx: any): Observable<INode> {
    const controller = root.get(WorkflowController);
    if (!controller) {
      throw new Error('WorkflowController 未找到');
    }
    return controller.execute(ast);
  }
}