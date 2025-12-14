

## 需求

每个节点可以多次发射不同的值，input$也可以多次发射

开发一个 run<Input>(node: INode, input$: Observable<Input>): Observable<INodeEvent>; 节点执行器

每一个种节点都有自己的 Visitor 负责生成 INodeEvent

如果运行的不是workflow，而是普通节点，直接调用node对应的Visitor执行即可 visitor(node, input$) 
如果是workflow，则调用workfow对应的visitor

workflow对应的visitor，需要根据 entryNodeIds 确定输入，赋值执行

```ts
export interface INodeEvent<T = any>{
    type: string;
    payload: T;
}
```

@sker/workflow是与平台无关的，可以在后台，前台运行，不要有任何与平台相关的依赖，如：react/nodejs等

1. 支持工作流的启动/停止等操作
2. 支持工作流中单个节点运行
3. 支持工作流节点中触发节点及以后的工作流执行
4. 图结构定义：WorkflowGraphAst
5. 支持图中存在子图及分组
6. WorkflowGraphAst 也是一个 Ast 不要区分对待，平等ast
7. 统一使用 INode/IEdge 如果没有必要 不要重新定义任何类型

要求：
每个节点有自己的执行逻辑

## 已有基础设施
1. @sker/workflow - 核心基础库
2. @sker/workflow-ast - 自定义工作流节点
3. @sker/workflow-browser - 工作流浏览器运行，浏览器不支持的使用sse-和@sker/workflow-run 实时通信，抹平平台差异
4. @sker/workflow-run - 工作流服务端运行
6. @sker/workflow-ui - 工作流前端UI
7. @sker/bigscreen - 工作流集成项目
8. @sker/ui - 前端UI样式及布局组件
9. @sker/api - 后端接口
10. @sker/sdk - 前端调用后端接口的通用封装