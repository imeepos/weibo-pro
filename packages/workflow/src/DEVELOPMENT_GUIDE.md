# 反应式工作流引擎 v2 - 后续开发指南

本文档为后续开发者快速上手提供指导
核心思想：编译期构建网络 + 运行期执行网络

---

## 📌 核心设计概览

**问题**：所有 @Output 都是 BehaviorSubject，如何管理数据流？

**解决**：可以不立即订阅，先构建网络结构（编译期），跑起来再订阅（执行期）。

### 关键函数：buildNodeObservable()

```typescript
function buildNodeObservable(
    node: INode,
    input$: Observable<any>
): Observable<INode> {
    return input$.pipe(
        switchMap(data => nodeExecutor.execute(node)),
        tap(updated => updateOutputSubjects(updated))
    );
}
```

**作用**：把静态节点转化为动态流处理节点

---

## 🏗️ 两阶段执行模型

### [编译期] buildNetwork() - 构建网络结构（不执行）

1. 初始化所有 @Output BehaviorSubject
2. 为每个节点创建 buildNodeObservable()
3. 为每条边创建数据流连接
4. 返回组合的 Observable（虚拟网络）

⚠️  **关键**：没有任何代码被执行，只是构建了 Observable 结构

### [执行期] .subscribe() - 激活网络（真正运行）

1. 调用 .subscribe() 时，所有 Observable 的 subscribe 被激活
2. 所有数据流连接被激活
3. 数据开始从输入流流向各节点
4. 每个节点的 @Output BehaviorSubject 实时发射
5. 下游自动接收数据并执行

**优势**：
- 网络可复用（多次 subscribe）
- 延迟执行（setTimeout 后再 subscribe）
- 并行执行（多个 subscribe）

---

## 📂 核心文件清单

### packages/workflow/src/execution/

#### 【已实现 - 可直接使用】

**1. network-builder.ts** ⭐ 重点
- NetworkBuilder 类
- buildNetwork(ast, ctx): Observable<WorkflowGraphAst>
- buildNodeObservable(node, input$, ast, ctx): Observable<INode>
- connectEdge(edge, ast, inputSubjects): void
- createEdgeStream(source, edge, ast, inputSubjects): Observable

**2. node-executor.ts**
- NodeExecutor 类
- execute(node, workflow, ctx): Observable<INode>

**3. reactive-scheduler-v2.ts**
- ReactiveScheduler 类（改进版）
- schedule(ast, ctx): Observable<WorkflowGraphAst>
- 简化后只负责构建网络，不管理订阅

**4. data-flow-manager-v2.ts**
- DataFlowManager 类（改进版）
- extractNodeOutputs(node): Record<string, any>
- getOutputSubjects(node): Map<string, BehaviorSubject>
- assignInputsToNode(...): void

#### 【需要完善】

- 错误处理和边界情况
- 性能优化（订阅管理、内存清理）
- 增量执行（fineTuneNode）
- 隔离执行（executeNodeIsolated）

---

## 🔧 关键实现细节

### 一、初始化 @Output BehaviorSubject

所有 @Output 都必须初始化为 BehaviorSubject：

```typescript
ast.nodes.forEach(node => {
    if (!node.metadata) return;
    node.metadata.outputs.forEach(output => {
        const current = (node as any)[output.property];
        if (!isBehaviorSubject(current)) {
            (node as any)[output.property] =
                new BehaviorSubject(current);
        }
    });
});
```

### 二、为节点构建 Observable

```typescript
function buildNodeObservable(
    node,
    input$,
    ast,
    ctx
) {
    return input$.pipe(
        switchMap(inputData => {
            Object.assign(node, inputData);
            return nodeExecutor.execute(node, ast, ctx);
        }),
        tap(updatedNode => {
            updateOutputSubjects(updatedNode);
        }),
        shareReplay(1)  // 共享该 Observable
    );
}
```

### 三、为边构建连接

每条边连接上游的 @Output (BehaviorSubject) 到下游的 input$ (Subject)：

```typescript
connectEdge(edge) {
    const sourceOutput = sourceNode[edge.fromProperty];
    const targetInput = inputSubjects.get(edge.to);

    if (isBehaviorSubject(sourceOutput)) {
        // 创建数据流（根据 edge.mode 处理）
        const stream$ = createEdgeStream(sourceOutput, edge);

        // 订阅数据流
        stream$.subscribe(value => {
            targetInput.next({ [edge.toProperty]: value });
        });
    }
}
```

### 四、流合并模式

```
EdgeMode.MERGE           → merge()
EdgeMode.ZIP             → zip()
EdgeMode.COMBINE_LATEST  → combineLatest()
EdgeMode.WITH_LATEST_FROM → withLatestFrom()
```

实现在 createEdgeStream() 中，根据 edge.mode 选择操作符。

---

## 🚀 实现路线图

### 第一阶段：核心架构验证（现在）

- ✅ NetworkBuilder 实现
- ✅ NodeExecutor 实现
- ✅ ReactiveScheduler v2 实现
- ✅ DataFlowManager v2 实现
- ✅ 文档编写
- 待：与现有代码集成和测试

### 第二阶段：集成与测试（下一步）

- □ 将新代码与现有的 VisitorExecutor 集成
- □ 更新 WorkflowExecutorVisitor（处理 WorkflowGraphAst）
- □ 编写单元测试（network-builder.spec.ts）
- □ 编写集成测试（end-to-end）
- □ 迁移现有的测试用例

### 第三阶段：功能完善（随后）

- □ 实现增量执行（fineTuneNode）
- □ 实现隔离执行（executeNodeIsolated）
- □ 错误处理和恢复机制
- □ 性能优化（订阅管理、内存泄漏防控）
- □ 支持条件边（edge.condition）的处理
- □ 支持动态节点添加

### 第四阶段：高级功能（最后）

- □ 工作流可视化（导出 Observable 图结构）
- □ 实时监控（通过订阅 BehaviorSubject）
- □ 工作流录制和回放
- □ 分布式执行支持
- □ 性能分析和优化

---

## 💻 开发指南

### 1. 理解核心概念（30分钟）

阅读顺序：
- ① QUICK_START_V2.md（5分钟）- 概览
- ② PHILOSOPHY_V2.md（15分钟）- 理解设计
- ③ ARCHITECTURE_V2.md（10分钟）- 了解细节

### 2. 查看现有实现（1小时）

- ① network-builder.ts - 理解 buildNetwork() 的完整逻辑
- ② node-executor.ts - 简单的包装器
- ③ reactive-scheduler-v2.ts - 调度器如何使用 NetworkBuilder
- ④ data-flow-manager-v2.ts - 数据流管理的细节

### 3. 集成到现有代码（2小时）

- ① 检查 VisitorExecutor 是否需要改动（应该不需要）
- ② 更新 ReactiveScheduler 的实例注入
- ③ 确保 WorkflowExecutorVisitor 能工作
- ④ 运行现有的测试，修复任何破坏

### 4. 编写测试（2小时）

- ① 单个节点的 buildNodeObservable 测试
- ② 多节点的连接测试
- ③ 不同 EdgeMode 的测试
- ④ 完整工作流的端到端测试

### 5. 优化和完善（持续）

- ① 性能分析
- ② 内存泄漏检测
- ③ 错误处理完善
- ④ 文档维护

---

## 🔍 调试技巧

### 1. 观测数据流

```typescript
// 订阅某个节点的输出
const node = workflow.nodes[0];
const output = node.output as BehaviorSubject<any>;
output.subscribe(value => {
    console.log(`Node output: ${value}`);
});
```

### 2. 追踪网络构建

```typescript
// 在 NetworkBuilder 中添加日志
buildNetwork(ast, ctx) {
    console.log('初始化 @Output BehaviorSubject...');
    this.initializeOutputSubjects(ast);

    console.log('为每个节点创建 Observable...');
    ast.nodes.forEach(node => {
        console.log(`  创建节点 ${node.id} 的 Observable`);
    });

    console.log('连接边...');
    ast.edges.forEach(edge => {
        console.log(`  连接 ${edge.from} → ${edge.to}`);
    });
}
```

### 3. 验证流合并模式

```typescript
// 检查边的模式是否正确
ast.edges.forEach(edge => {
    console.log(`Edge ${edge.id}:`);
    console.log(`  Mode: ${edge.mode ?? 'MERGE'}`);
    console.log(`  From: ${edge.from}.${edge.fromProperty}`);
    console.log(`  To: ${edge.to}.${edge.toProperty}`);
});
```

---

## ⚠️ 常见问题和陷阱

### 问题1：@Output 不是 BehaviorSubject

**原因**：节点定义中没有初始化 @Output 为 BehaviorSubject

**解决**：确保所有 @Node 类的 @Output 都初始化为 BehaviorSubject

```typescript
@Output()
result: BehaviorSubject<string> = new BehaviorSubject('');
```

### 问题2：下游节点收不到数据

**原因**：可能是边的连接错误或流合并模式不对

**调试步骤**：
- ① 检查边的 from/to/fromProperty/toProperty
- ② 检查上游节点是否真的发射了数据
- ③ 检查边的 mode 是否正确
- ④ 在 connectEdge 中添加日志，观察数据是否流动

### 问题3：内存泄漏（订阅没有清理）

**原因**：Observable 的订阅没有在适当的时机取消

**解决**：使用 RxJS 的取消订阅机制

```typescript
const subscription = observable.subscribe(...);
// ... 使用 subscription ...
subscription.unsubscribe();  // 清理
```

或使用 takeUntil：

```typescript
observable.pipe(
    takeUntil(destroy$)  // destroy$ 是一个 Subject
).subscribe(...);
```

### 问题4：同一网络多次 subscribe 时状态混乱

**原因**：节点状态没有被正确重置

**解决**：每次执行前调用 resetWorkflow()

---

## 📊 性能考虑

### 1. 订阅管理

- 每个边会创建一个订阅（edge 数量）
- 需要在合适的时机清理订阅
- 使用 finalize() 操作符确保清理

### 2. BehaviorSubject 的内存占用

- 每个 @Output 都是一个 BehaviorSubject
- 保存最新的值在内存中
- 大型工作流需要注意内存占用

### 3. 复杂流合并的性能

- ZIP 模式：需要等待所有上游，性能较差
- COMBINE_LATEST：性能较好
- WITH_LATEST_FROM：性能最好

合理选择 EdgeMode 很重要

---

## 📝 代码规范

### 1. 命名约定

- Observable 变量以 $ 结尾：input$, output$, network$
- BehaviorSubject 变量：output, result（不加 $）
- 函数名：buildXxx(), createXxx(), extractXxx()

### 2. 注释规范

- 关键函数需要详细注释
- 复杂逻辑需要解释为什么这样做
- 避免明显的注释（好的代码本身是自文档化的）

### 3. 错误处理

- 所有 Observable 都应该有 error 处理
- 关键操作应该有 try-catch
- 提供有意义的错误信息

---

## 🎯 下一步行动计划

### 【立即可做】

1. 运行 main.ts 中的测试，检查现有功能是否正常
2. 集成 NetworkBuilder，替换 ReactiveScheduler
3. 编写基础的集成测试

### 【需要的决策】

1. 是否完全迁移到 v2？（建议是）
2. 旧的 v1 代码是否保留？（建议保留作为参考）
3. 何时启用 v2 在生产环境？（建议先在测试环境验证）

### 【长期维护】

1. 定期更新文档（代码变化时）
2. 持续性能监控（内存、订阅数量）
3. 收集用户反馈（哪些地方不易用）
4. 规划新功能（如可视化、监控等）

---

## 📖 参考资源

### 本项目文档

- README_V2.md - 文档导航
- QUICK_START_V2.md - 快速入门
- PHILOSOPHY_V2.md - 设计哲学
- ARCHITECTURE_V2.md - 技术架构

### 外部资源

- [RxJS 官方文档](https://rxjs.dev/)
- [反应式编程入门](https://gist.github.com/staltz/868e7e9bc2a7b8c1f754)
- [TypeScript 装饰器](https://www.typescriptlang.org/docs/handbook/decorators.html)
