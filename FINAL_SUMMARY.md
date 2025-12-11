# 反应式工作流引擎 v2 - 核心实现总结

## 🎯 核心思路（极简版）

三个函数，完成整个流式网络的构建和执行：

### 1️⃣ buildNodeObservable(node, input$)
```
输入流 → 赋值node → 执行Handler → 更新@Output → 输出流
```
- **作用**：把一个节点转化为可流式执行的 Observable
- **输入**：节点 + 输入流（来自前端或上游节点）
- **输出**：该节点的执行结果流

### 2️⃣ buildNodeInput(node, workflow)
```
找入边 → 聚合上游输出 → 该节点的输入流
```
- **作用**：为节点构建输入流
- **过程**：
  1. 找到所有指向该节点的边（入边）
  2. 从源节点获取 @Output BehaviorSubject
  3. 用 combineLatest 聚合多个输入
  4. 返回输入对象流

### 3️⃣ buildNetwork(workflow, input$)
```
初始化BehaviorSubject → 找entryNodeIds → 为所有节点构建流 → 聚合endNodeIds → 返回最终输出
```
- **作用**：构建整个工作流网络
- **过程**：
  1. 初始化所有 @Output 为 BehaviorSubject
  2. 找到起始节点（entryNodeIds）
  3. 为每个节点连接输入输出流
  4. 找到结束节点（endNodeIds）
  5. 聚合结束节点输出为最终结果

---

## 💡 核心设计原理

### 数据流的完整路径

```
前端输入
   ↓
input$ (Subject)
   ↓
[entryNode] buildNodeObservable()
   ├─ 赋值给node属性
   ├─ 执行node的Handler
   └─ 更新 @Output BehaviorSubject
   ↓
node.output (BehaviorSubject) 自动流向下游
   ↓
[nextNode] buildNodeInput() 订阅上游输出
   ├─ combineLatest 聚合多个输入
   └─ 得到 nextNode 的输入流
   ↓
[nextNode] buildNodeObservable()
   ... 继续链式执行
   ↓
[endNode] @Output
   ↓
最终输出流
```

### 关键特性

1. **自动化连接**
   - 边定义了连接关系
   - buildNodeInput 自动找到并聚合上游输出

2. **流式执行**
   - 上游有输出 → 下游自动收到 → 立即执行
   - 无需显式调度

3. **可复用**
   - buildNetwork 返回 Observable
   - 多次 subscribe = 多次执行
   - 支持延迟、并行执行

---

## 📝 代码位置

```
packages/workflow/src/
├── demo.ts              ← 完整实现（刚创建）
├── core.ts              ← 核心实现（之前创建）
└── execution/
    ├── network-builder.ts       (可参考或删除)
    ├── node-executor.ts         (可参考或删除)
    ├── reactive-scheduler-v2.ts (可参考或删除)
    └── data-flow-manager-v2.ts  (可参考或删除)
```

**推荐**：使用 demo.ts 中的三个函数作为最终实现

---

## 🚀 使用示例

```typescript
// 1. 定义节点
@Node()
class NodeA extends Ast {
    @Input() text: string = '';
    @Output() output: BehaviorSubject<string> = new BehaviorSubject('');
}

// 2. 实现Handler
class NodeAHandler {
    @Handler(NodeA)
    execute(node: NodeA): Observable<NodeA> {
        node.output.next(node.text.toUpperCase());
        return of(node);
    }
}

// 3. 构建工作流
const workflow = {
    entryNodeIds: ['A'],
    endNodeIds: ['B'],
    nodes: [nodeA, nodeB],
    edges: [{ from: 'A', to: 'B', fromProperty: 'output', toProperty: 'text' }]
};

// 4. 执行网络
const input$ = new Subject<any>();
const output$ = buildNetwork(workflow, input$);

output$.subscribe(result => console.log(result));
input$.next({ text: 'hello' });  // 触发执行
```

---

## ✅ 验证清单

- [x] buildNodeObservable 实现
- [x] buildNodeInput 实现
- [x] buildNetwork 实现
- [x] 辅助函数 initializeOutputSubjects
- [x] 完整的注释和文档
- [ ] 单元测试
- [ ] 集成测试
- [ ] 与现有代码整合

---

## 📌 后续步骤

1. **验证 demo.ts 的正确性**
   - 检查三个函数的逻辑
   - 补充错误处理

2. **编写测试**
   - 单节点执行测试
   - 多节点流程测试
   - 边聚合测试

3. **集成到现有系统**
   - 替换 ReactiveScheduler
   - 确保兼容性
   - 运行现有测试

4. **性能优化**
   - 订阅管理
   - 内存清理
   - 性能基准测试

---

**最终总结**：三个函数，搞定流式工作流引擎！🎉
