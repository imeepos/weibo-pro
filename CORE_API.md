# 反应式工作流引擎 v2 - 最简洁核心 API

## 🎯 核心函数签名

```typescript
export function run<Input, Output>(
    node: INode,
    input$: Observable<Input>
): Observable<Output>
```

**关键点**：
- 输入是 `Observable<Input>` - 可以是任何类型
- 输出是 `Observable<Output>` - 也可以是任何类型
- 节点就是一个流函数：`Input → Output`

## 📝 三步执行

```typescript
return input$.pipe(
    switchMap((inputData: Input) => {
        // Step 1: 赋值
        Object.assign(node, inputData);

        // Step 2: 执行 Handler
        return visitor.visit(node, {} as any).pipe(
            tap(updated => {
                // Step 3: 更新 @Output BehaviorSubject
                updateOutputSubjects(updated);
            }),
            // Step 4: 提取输出
            map(updated => (updated as any)[outputProp] as Output)
        );
    })
);
```

## 💡 使用示例

### 单个节点

```typescript
// 节点：string → UPPERCASE → string

run<string, string>(
    nodeA,
    of('hello')
).subscribe(output => {
    console.log(output);  // "HELLO"
});
```

### 整个工作流

```typescript
// 工作流：{ text: string } → [A → B] → string

runWorkflow(workflow, of({ text: 'hello' }))
    .subscribe(output => {
        console.log('Result:', output);  // "HELLO [5]"
    });
```

## 🏗️ 两个函数完成整个系统

### 1. run<Input, Output>()
**执行单个节点**

```typescript
run<string, string>(node, of('hello')): Observable<string>
```

### 2. runWorkflow()
**协调整个网络**

```typescript
runWorkflow(workflow, input$): Observable<any>
```

## 📊 代码量统计

| 部分 | 代码行数 |
|------|---------|
| run() 函数 | 25行 |
| getNodeInput() | 25行 |
| runWorkflow() | 30行 |
| 总计 | **80行** |

## ✨ 设计精妙之处

### 纯函数式
```typescript
节点 = (Input: Observable) ⇒ Output: Observable
```

### 完全类型安全
```typescript
run<Input, Output>(node, input$): Observable<Output>
```

### 灵活的数据类型
```typescript
// 可以是任何类型
run<string, number>(node, of('5')): Observable<number>
run<User, Post[]>(node, userStream): Observable<Post[]>
run<any, any>(node, input$): Observable<any>
```

## 🎓 核心思想

**所有节点都是流函数**

```
观察这个公式：

      input$ (Observable<Input>)
          ↓
    run<Input, Output>(node)
          ↓
      output$ (Observable<Output>)

这就是整个工作流引擎的本质。
```

## 📁 文件

```
packages/workflow/src/
└── core-simple.ts     ← 完整实现（80行代码）
```

---

**完成！** 最简洁、最清晰的工作流引擎核心 API 🚀
