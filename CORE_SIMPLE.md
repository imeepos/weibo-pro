# 反应式工作流引擎 v2 - 超简洁版本

## 🎯 核心设计（一行总结）

```typescript
input$ → switchMap(执行node) → output$
```

## 📝 完整代码

只需一个主函数：

```typescript
export function run<T = any>(
    node: INode,
    input$: Observable<T>
): Observable<INode> {
    const visitor = root.get(VisitorExecutor);

    return input$.pipe(
        switchMap((inputData: T) => {
            Object.assign(node, inputData);
            return visitor.visit(node, {} as any);
        })
    );
}
```

## 🏗️ 完整系统（三个函数）

### 1. run(node, input$)
**核心函数** - 单个节点执行

```typescript
run(node, input$): Observable<INode>
```

### 2. input(node, workflow)
**辅助函数** - 节点输入聚合

```typescript
// 根据入边找上游节点 → 订阅输出 → combineLatest → 聚合成输入对象
input(node, workflow): Observable<any>
```

### 3. workflow(workflow, input$)
**协调函数** - 整个网络

```typescript
// 初始化BehaviorSubject → 为每个节点连接流 → 聚合endNodeIds → 输出
workflow(workflow, input$): Observable<any>
```

## 💡 执行流程

```
用户输入
   ↓
input$ (Observable<Input>)
   ↓
run(node, input$) {
   switchMap(inputData => {
      Object.assign(node, inputData)      // 赋值
      return visitor.visit(node)          // 执行
   })
}
   ↓
Observable<INode>
   ↓
@Output BehaviorSubject → 下游自动订阅
```

## 🚀 使用示例

```typescript
// 1. 定义节点
const nodeA = { type: 'NodeA', text: '', output: new BehaviorSubject('') };

// 2. 创建输入流
const input$ = of({ text: 'hello' });

// 3. 执行
run(nodeA, input$).subscribe(result => {
    console.log('NodeA output:', nodeA.output.getValue());
});
```

## 📊 代码对比

| 版本 | 主函数数 | 行数 | 复杂度 |
|------|----------|------|--------|
| v1 (旧) | 多个 | 1000+ | 高 |
| v2 (完整) | 3个 | 200+ | 中 |
| v2 (超简) | 1个 | 15 | 低 ✨ |

## ✅ 关键特性

- ✨ **极简** - 核心逻辑只需15行代码
- 🔄 **流式** - 纯 RxJS Observable 管道
- 🎯 **清晰** - 职责单一，易于理解
- 📦 **可组合** - 轻松构建复杂流程

## 📂 文件位置

```
packages/workflow/src/
├── core-simple.ts       ← 超简洁实现（推荐）
└── demo.ts              ← 完整参考实现
```

## 🎓 设计哲学

**"万物皆流"** - 节点就是一个函数，输入流 → 输出流

```
node = (input: Observable<T>) => Observable<U>
```

这就是所有工作流引擎的本质。✨
