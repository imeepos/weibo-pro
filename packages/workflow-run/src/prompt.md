### 需求

visitor的职责是，处理 input$ 并发射相关事件

请逐个处理一下文件：
packages\workflow-run\src\PersonaAstVisitor.ts
packages\workflow-run\src\PersonaCreatorAstVisitor.ts
packages\workflow-run\src\PostContextCollectorVisitor.ts
packages\workflow-run\src\PostNLPAnalyzerVisitor.ts
packages\workflow-run\src\PromptRoleSkillAstVisitor.ts
packages\workflow-run\src\QueryRewriterAstVisitor.ts
packages\workflow-run\src\ResearchPlannerAstVisitor.ts
packages\workflow-run\src\ScheduledWorkflowVisitor.ts
packages\workflow-run\src\SerpClusterAstVisitor.ts
packages\workflow-run\src\ShareAstVisitor.ts
packages\workflow-run\src\StoreAstVisitor.ts
packages\workflow-run\src\SwitchAstVisitor.ts
packages\workflow-run\src\WeiboAccountPickAstVisitor.ts
packages\workflow-run\src\WeiboAjaxFeedHotTimelineAstVisitor.ts
packages\workflow-run\src\WeiboAjaxFriendshipsAstVisitor.ts
packages\workflow-run\src\WeiboAjaxProfileInfoAstVisitor.ts
packages\workflow-run\src\WeiboAjaxStatusesCommentAstVisitor.ts
packages\workflow-run\src\WeiboAjaxStatusesLikeShowAstVisitor.ts
packages\workflow-run\src\WeiboAjaxStatusesMymblogAstVisitor.ts
packages\workflow-run\src\WeiboAjaxStatusesRepostTimelineAstVisitor.ts
packages\workflow-run\src\WeiboAjaxStatusesShowAstVisitor.ts
packages\workflow-run\src\WeiboKeywordSearchAstVisitor.ts
packages\workflow-run\src\WeiboLoginAstVisitor.ts


```ts
export interface Visitor {
    visit(ast: INode, input$: Observable<any>, ctx: WorkflowGraphAst): Observable<NodeEvent>;
}
```

这是 Visitor的基础结构 ast是要执行的工作流中的某个节点 input$是输入流 ctx是工作流，需要先发射 node_runing 然后处理 input$ 的每个值 然后成功发送 node_success 失败发送 node_fail


例如：packages\workflow\src\defaultVisitor.ts

```ts
import { isObservable, Observable } from "rxjs";
import { INode } from "./types";
import { NodeEvent } from "./execution/events";
import { setAstError } from "./ast-utils";
import { WorkflowGraphAst } from "./ast";

export class DefaultVisitor {
    visit(ast: INode, input$: Observable<INode>, workflow?: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable(obs => {
            console.log(`DefaultVisitor run ${ast.type}`)
            if (!input$) throw new Error(`[DefaultVisitor.handler] input$ is empty`)
            if (!isObservable(input$)) throw new Error(`[DefaultVisitor.handler] input$ must be an Observable`)
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast })
            input$.subscribe({
                next: (data) => {
                    // 默认 一个输入 一个输出 输出直接等于输入
                    ast.metadata?.inputs.map(input => {
                        ast.metadata?.outputs.map(output => {
                            ast[output.property] = data[input.property];
                            obs.next({ type: 'node_emit', id: ast.id, property: output.property, value: ast[output.property] })
                        })
                    })
                },
                error: (error) => {
                    ast.state = 'fail';
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, data: ast })
                    obs.complete();
                },
                complete: () => {
                    ast.state = 'success';
                    obs.next({ type: 'node_success', id: ast.id, data: ast })
                    obs.complete();
                }
            })
        });
    }
}
```