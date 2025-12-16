# StoryWeaverAstVisitor RxJS 重构说明

## 重构概述

将 `StoryWeaverAstVisitor.ts` 从传统的命令式 while 循环重构为 RxJS 响应式编程模式，实现更优雅的错误处理、重试机制和状态管理。

## 重构前后对比

### 重构前（命令式）

```typescript
// 使用 while 循环处理重试
while (rewriteAttempt <= maxRewriteRetries) {
  // 生成章节
  const parsed = await model.invoke(...);

  // 质检重试（内部又是 while 循环）
  let qualityCheckAttempt = 0;
  while (qualityCheckAttempt < maxQualityCheckRetries) {
    try {
      qualityResult = await this.qualityService.check(...);
      break;
    } catch (error) {
      // 手动实现重试逻辑
    }
  }

  // 检查是否达标，决定是否继续
  if (qualityResult.score >= ast.minQualityScore) {
    break;
  }
}
```

### 重构后（响应式）

```typescript
// 使用 expand 创建重试循环
return of({ attempt: 0, improvementHints: '', allAttempts: [] }).pipe(
  expand((state) => {
    // 生成 + 质检
    return from(model.invoke(...)).pipe(
      concatMap(({ chapter, attempt }) => {
        // 质检重试（使用 expand）
        return of(0).pipe(
          expand((retryCount) => {
            if (retryCount >= 3) return of();
            return from(this.qualityService.check(...)).pipe(
              catchError(...) // 处理重试
            );
          }),
          scan((acc, curr) => curr, null as QualityCheckResult | null),
          take(1)
        );
      }),
      map(({ chapter, quality, attempt }) => {
        // 决定是否继续重试
        return {
          shouldContinue: quality.score < ast.minQualityScore && attempt < maxRetries,
          result: { chapter, quality, attempt },
          improvementHints: this.buildImprovementHints(quality),
          nextAttempt: attempt + 1
        };
      })
    );
  }),
  // 累积所有尝试
  scan((acc, curr) => { ... }, initialState),
  // 选择最佳版本
  last(),
  map((finalState) => {
    return finalState.allAttempts.reduce((best, current) =>
      current.quality.score > best.quality.score ? current : best
    );
  })
);
```

## 核心 RxJS 操作符使用

### 1. `expand` - 创建递归/重试循环

**作用**：递归展开Observable，实现重试逻辑

**使用场景**：
- 章节生成失败重试
- 质检失败重试
- 条件性继续循环

**代码示例**：
```typescript
expand((state) => {
  if (state.attempt >= maxRetries) {
    return of(); // 结束递归
  }
  // 返回下一个状态的 Observable
  return performOperation(state);
})
```

### 2. `scan` - 累积状态

**作用**：累积流中的值，类似于 reduce，但保留所有中间状态

**使用场景**：
- 累积所有重试尝试的结果
- 构建改进提示的上下文

**代码示例**：
```typescript
scan((acc, curr) => {
  if (curr.result) {
    acc.allAttempts.push(curr.result);
  }
  return {
    attempt: curr.nextAttempt || curr.attempt,
    improvementHints: curr.improvementHints || '',
    allAttempts: acc.allAttempts
  };
}, initialState)
```

### 3. `catchError` - 错误处理

**作用**：优雅处理错误，支持重试、降级策略

**使用场景**：
- 质检服务失败时的指数退避重试
- 最后一次失败时提供默认值

**代码示例**：
```typescript
catchError((error, retryCount) => {
  if (retryCount < 2) {
    // 重试
    const backoffDelay = 1000 * Math.pow(2, retryCount);
    return from(new Promise(resolve => setTimeout(resolve, backoffDelay))).pipe(
      concatMap(() => throwError(() => error))
    );
  } else {
    // 使用默认值
    return of(defaultQualityResult);
  }
})
```

### 4. `concatMap` - 顺序执行

**作用**：等待前一个 Observable 完成后再执行下一个

**使用场景**：
- 生成章节 → 质检 → 决策 的流程控制

**代码示例**：
```typescript
concatMap(({ chapter, attempt }) => {
  // 先质检
  return performQualityCheck(chapter).pipe(
    // 质检完成后决定下一步
    map((quality) => ({ chapter, quality, attempt }))
  );
})
```

### 5. `filter` + 类型守卫 - 类型安全

**作用**：过滤并保持类型信息

**使用场景**：
- 过滤 null 值并保持类型

**代码示例**：
```typescript
scan((acc, curr) => curr, null as QualityCheckResult | null),
filter((result): result is QualityCheckResult => result !== null)
```

## 重构收益

### 1. **声明式编程**

**Before**：
```typescript
// 需要手动追踪状态、循环条件、重试次数
let rewriteAttempt = 0;
let improvementHints = '';
let chapterData = null;

while (rewriteAttempt <= maxRewriteRetries) {
  // 复杂的控制流
  if (condition1) { ... }
  else if (condition2) { ... }
  else { ... }
}
```

**After**：
```typescript
// 声明式描述"是什么"而不是"怎么做"
of(initialState).pipe(
  expand(state => condition ? nextState : of()),
  scan((acc, curr) => { ... }),
  last()
)
```

### 2. **更好的错误处理**

**Before**：嵌套的 try-catch，错误传播不清晰
```typescript
try {
  const parsed = await model.invoke(...);
  try {
    qualityResult = await this.qualityService.check(...);
  } catch (e) {
    // 手动重试
  }
} catch (e) {
  // 处理生成失败
}
```

**After**：统一的错误处理管道
```typescript
from(model.invoke(...)).pipe(
  catchError(error => {
    // 错误分类处理
    if (error.message.startsWith('TITLE_DUPLICATE:')) {
      return of({ shouldContinue: true, improvementHints: ... });
    }
    return throwError(() => error);
  })
)
```

### 3. **状态管理更清晰**

**Before**：多个分散的变量
```typescript
let chapterData = null;
let qualityResult = { score: 70, ... };
let rewriteAttempt = 0;
let improvementHints = '';
```

**After**：单一状态对象
```typescript
{
  attempt: number;
  improvementHints: string;
  allAttempts: Array<{ chapter: ChapterData; quality: QualityCheckResult; attempt: number }>;
}
```

### 4. **可测试性提升**

- **纯函数**：每个操作符都是纯函数，易于单元测试
- **组合性**：可以轻松组合和重用操作符链
- **隔离性**：每个步骤的输入输出清晰定义

### 5. **资源管理优化**

- **自动取消**：Observable 链会在 unsubscribe 时自动取消所有嵌套操作
- **内存安全**：`last()` 操作符确保只保留最终状态，避免内存泄漏

## 关键设计决策

### 1. 为什么使用 `expand` 而不是递归函数？

**原因**：
- `expand` 是 RxJS 的递归操作符，原生支持取消和错误处理
- 可以与 Observable 管道无缝集成
- 自动处理背压和资源清理

### 2. 为什么使用 `scan` 而不是 `reduce`？

**原因**：
- `scan` 保留所有中间状态，便于调试和审计
- 可以实时查看重试过程
- `reduce` 只保留最终结果，调试困难

### 3. 为什么在内部质检重试也使用 `expand`？

**原因**：
- 保持一致性：所有重试逻辑都使用相同的模式
- 可组合：可以将质检重试提取为独立函数
- 错误传播：错误可以正确传播到外层

### 4. 为什么最后要 `reduce` 选择最佳版本？

**原因**：
- 即使所有重试都失败，也有一个可用版本
- 质量分数为选择标准，客观可靠
- 可以扩展为更复杂的评分算法

## 性能考虑

### 1. **惰性求值**

- Observable 只有在订阅时才开始执行
- `expand` 只有在需要时才会生成下一个状态
- 避免不必要的计算

### 2. **背压处理**

- `take(1)` 确保只取第一个质检结果
- `takeWhile` 控制重试次数
- `last()` 确保只处理最终状态

### 3. **内存优化**

- `scan` 的累积器在每次迭代后更新，避免累积所有中间状态（除了必要的）
- `allAttempts` 数组是必需的，用于选择最佳版本

## 可扩展性

### 1. **添加新的重试策略**

```typescript
// 轻松添加不同的重试策略
expand((state, index) => {
  const strategy = retryStrategies[index % retryStrategies.length];
  return strategy.execute(state);
})
```

### 2. **添加监控和日志**

```typescript
tap((state) => {
  metrics.recordRetryAttempt(state.attempt);
  logger.info(`重试第${state.attempt}次`, state);
})
```

### 3. **并行尝试**

```typescript
// 可以轻松改为并行尝试多个版本
mergeMap(({ chapter, attempt }) => {
  return forkJoin([
    attemptWithStrategyA(chapter),
    attemptWithStrategyB(chapter),
    attemptWithStrategyC(chapter)
  ]);
})
```

## 调试技巧

### 1. **使用 `tap` 调试**

```typescript
tap((state) => console.log('当前状态:', state)),
tap((state) => console.log('尝试次数:', state.attempt)),
tap((state) => console.log('当前分数:', state.allAttempts[state.attempt]?.quality.score))
```

### 2. **时间旅行调试**

```typescript
scan((acc, curr, index) => {
  console.log(`步骤 ${index}:`, curr);
  return accumulator;
}, initialState)
```

## 总结

这次重构将命令式的 while 循环转换为响应式的 Observable 管道，实现了：

✅ **写小说失败重试** - 使用 `expand` 创建重试循环
✅ **质检失败重试** - 内层 `expand` 处理质检重试
✅ **带改进提示重试** - `scan` 累积改进提示并传递给下一轮
✅ **选择最高分版本** - `reduce` 从所有尝试中选择最佳
✅ **完成时发送事件** - 统一的节点事件发射机制

代码更优雅、更可维护、更易于测试，同时保持了所有原有功能。RxJS 的声明式编程模式让业务逻辑更加清晰，状态管理更加可控。
