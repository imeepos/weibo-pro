# @sker/workflow-browser

浏览器端工作流执行器 - 前端运行时的 Visitor 实现层。

## 概览

`@sker/workflow-browser` 是工作流引擎在浏览器端的执行层，提供了所有 AST 节点在前端运行时的 Visitor 实现。它采用**远程代理模式** + **本地执行模式**的混合架构：

- **远程代理**：大部分节点通过 `executeRemote()` 将执行委托给后端 API（通过 SSE 实时同步状态）
- **本地执行**：控制流节点（Loop/Switch/Merge/Share）直接在浏览器端执行，减少网络开销

## 核心架构

### 1. 执行模式分类

```typescript
// 远程代理执行（通过后端 API）
@Injectable()
export class WeiboKeywordSearchBrowserVisitor {
  @Handler(WeiboKeywordSearchAst)
  handler(ast: WeiboKeywordSearchAst, ctx: any): Observable<NodeEvent> {
    return executeRemote(ast, ctx); // 委托给后端
  }
}

// 本地直接执行（纯浏览器端）
@Injectable()
export class LoopAstVisitor {
  @Handler(LoopAst)
  handler(ast: LoopAst, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
      // 直接在浏览器端执行循环逻辑
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id, data: ast });
      // ... 执行逻辑
    });
  }
}
```

### 2. 远程执行器 (`execute-remote.ts`)

统一的远程执行代理，解决 SSE 返回数据与本地 AST 实例不一致的问题：

```typescript
/**
 * 统一的远程执行器
 *
 * 职责：
 * 1. 调用远程 API 执行工作流（通过 WorkflowController）
 * 2. 实时处理 output_emit 事件，同步 BehaviorSubject 值到本地 AST 实例
 * 3. 返回节点状态更新流（RxJS Observable）
 *
 * @param ast - 当前节点 AST 实例
 * @param parent - 父工作流图 AST
 * @param input - 可选的输入数据
 */
export function executeRemote(
    ast: Ast,
    parent: WorkflowGraphAst,
    input: Record<string, any> = {}
): Observable<NodeEvent> {
    const controller = root.get(WorkflowController); // 从 DI 容器获取
    if (!controller) {
        throw new Error('WorkflowController 未注入，请确保已配置 SDK providers');
    }
    return controller.execute({ ast, workflow: parent, input });
}
```

**关键设计**：
- 通过 `@sker/sdk` 的 `WorkflowController` 调用后端 API
- 后端通过 SSE 实时推送节点状态变化（`node_running`, `node_emit`, `node_success`）
- 前端监听事件流，同步更新本地 AST 实例的 BehaviorSubject 属性

## 目录结构

```
packages/workflow-browser/
├── src/
│   ├── index.ts                              # 入口：导入所有 Visitor（自动注册到 DI 容器）
│   ├── execute-remote.ts                     # 远程执行器核心逻辑
│   │
│   ├── WorkflowGraphBrowserVisitor.ts        # 工作流图执行器
│   │
│   ├── # 微博数据采集节点（远程执行）
│   ├── WeiboLoginBrowserVisitor.ts           # 微博登录
│   ├── WeiboKeywordSearchBrowserVisitor.ts   # 关键词搜索
│   ├── WeiboAjaxStatusesShowBrowserVisitor.ts        # 获取微博详情
│   ├── WeiboAjaxStatusesCommentBrowserVisitor.ts     # 获取评论列表
│   ├── WeiboAjaxStatusesRepostTimelineBrowserVisitor.ts  # 获取转发列表
│   ├── WeiboAjaxStatusesLikeShowBrowserVisitor.ts    # 获取点赞列表
│   ├── WeiboAjaxStatusesMymblogBrowserVisitor.ts     # 获取用户微博列表
│   ├── WeiboAjaxProfileInfoBrowserVisitor.ts         # 获取用户资料
│   ├── WeiboAjaxFriendshipsBrowserVisitor.ts         # 获取关注/粉丝列表
│   ├── WeiboAjaxFeedHotTimelineBrowserVisitor.ts     # 获取热门微博
│   ├── WeiboAccountPickAstBrowserVisitor.ts          # 微博账号选择器
│   ├── WeiboUserDetectionAstVisitor.ts               # 微博用户检测
│   │
│   ├── # 数据处理节点（远程执行）
│   ├── PostContextCollectorBrowserVisitor.ts # 帖子上下文收集器
│   ├── PostNLPAnalyzerBrowserVisitor.ts      # NLP 情感分析
│   ├── EventAutoCreatorBrowserVisitor.ts     # 自动生成舆情事件
│   │
│   ├── # LLM 节点（远程执行）
│   ├── LlmTextAgentAstVisitor.ts             # LLM 文本 Agent
│   ├── LlmStructuredOutputAstVisitor.ts      # LLM 结构化输出
│   ├── LlmCategoryAstVisitor.ts              # LLM 分类
│   │
│   ├── # Persona 节点（远程执行）
│   ├── PersonaAstBrowserVisitor.ts           # 人物角色节点
│   ├── PersonaCreatorAstVisitor.ts           # 人物角色创建器
│   ├── PromptRoleSkillAstVisitor.ts          # 提示词角色技能
│   │
│   ├── # 研究类节点（远程执行）
│   ├── ResearchPlannerAstVisitor.ts          # 研究计划器
│   ├── QueryRewriterAstVisitor.ts            # 查询重写器
│   ├── SerpClusterAstVisitor.ts              # 搜索结果聚类
│   ├── AnswerEvaluatorAstVisitor.ts          # 答案评估器
│   ├── AnswerFinalizerAstVisitor.ts          # 答案最终化器
│   ├── ErrorAnalyzerAstVisitor.ts            # 错误分析器
│   │
│   ├── # 控制流节点（本地执行）
│   ├── LoopAstVisitor.ts                     # 循环节点
│   ├── SwitchAstVisitor.ts                   # 条件分支节点
│   ├── MergeAstVisitor.ts                    # 数据合并节点
│   ├── ShareAstVisitor.ts                    # 群聊/消息共享节点
│   │
│   └── # 基础设施节点（远程执行）
│       ├── StoreVisitor.ts                   # 状态存储节点（StoreGet/StoreSet）
│       └── MqVisitor.ts                      # 消息队列节点（MqPull/MqPush）
│
├── package.json
└── tsconfig.json
```

## 核心节点详解

### 1. 控制流节点（本地执行）

#### LoopAstVisitor - 循环节点

批量处理数据流，支持分批 + 延迟控制。

```typescript
@Injectable()
export class LoopAstVisitor {
    @Handler(LoopAst)
    handler(ast: LoopAst, ctx: any): Observable<NodeEvent> {
        return new Observable(obs => {
            // 1. 扁平化并过滤输入数组
            let items: any[] = ast.items || [];
            if (!Array.isArray(items)) items = [items];
            items = items.flat().filter(v => v != null);

            const batchSize = Math.max(1, ast.batchSize || 1); // 每批数量
            const delay = Math.max(0, ast.delay || 0);         // 批次间延迟（ms）
            const total = items.length;

            // 2. 递归批量发射
            const emitBatch = (startIndex: number) => {
                const endIndex = Math.min(startIndex + batchSize, total);
                const batch = batchSize === 1
                    ? items[startIndex]         // 单个元素
                    : items.slice(startIndex, endIndex); // 批量数组

                obs.next({ type: 'node_emit', id: ast.id, property: 'index', value: startIndex });
                obs.next({ type: 'node_emit', id: ast.id, property: 'current', value: batch });

                // 3. 调度下一批次
                const nextIndex = endIndex;
                if (nextIndex < total) {
                    if (delay > 0) {
                        setTimeout(() => emitBatch(nextIndex), delay);
                    } else {
                        emitBatch(nextIndex);
                    }
                } else {
                    obs.next({ type: 'node_emit', id: ast.id, property: 'done', value: true });
                    ast.state = 'success';
                    obs.complete();
                }
            };

            emitBatch(0);
        });
    }
}
```

**输出属性**：
- `current` - 当前批次数据（单个元素或数组）
- `index` - 当前批次起始索引
- `total` - 总元素数量
- `done` - 是否完成（布尔值）

#### SwitchAstVisitor - 条件分支节点

根据输入值匹配条件，路由到不同输出分支。

```typescript
@Injectable()
export class SwitchAstVisitor {
    @Handler(SwitchAst)
    handler(ast: SwitchAst, ctx: any): Observable<NodeEvent> {
        return new Observable(obs => {
            const inputValue = ast.value;
            const outputs = ast.metadata.outputs;

            // 1. 找到默认分支和条件分支
            const defaultOutput = outputs.find(o =>
                o.isRouter && (o.condition === 'true' || o.property === 'output_default')
            );
            const normalOutputs = outputs.filter(o =>
                o.isRouter && o.condition && o.condition !== 'true' && o.property !== 'output_default'
            );

            // 2. 评估所有条件分支
            let anyMatched = false;
            normalOutputs.forEach(outputMeta => {
                const matched = this.evaluateCondition(outputMeta.condition!, { $input: inputValue });

                if (matched) {
                    anyMatched = true;
                    obs.next({ type: 'node_emit', id: ast.id, property: outputMeta.property, value: inputValue });
                } else {
                    obs.next({ type: 'node_emit', id: ast.id, property: outputMeta.property, value: ROUTE_SKIPPED });
                }
            });

            // 3. 处理默认分支（仅当没有匹配时激活）
            if (defaultOutput) {
                const value = anyMatched ? ROUTE_SKIPPED : inputValue;
                obs.next({ type: 'node_emit', id: ast.id, property: defaultOutput.property, value });
            }

            obs.complete();
        });
    }

    private evaluateCondition(condition: string, context: any): boolean {
        try {
            const func = new Function(...Object.keys(context), `return ${condition}`);
            return func(...Object.values(context));
        } catch {
            return false;
        }
    }
}
```

**条件表达式示例**：
```javascript
$input === 'success'        // 相等判断
$input > 100                // 数值比较
$input.includes('关键词')   // 字符串方法
true                         // 默认分支
```

**路由机制**：
- 匹配分支：输出原始 `inputValue`
- 未匹配分支：输出 `ROUTE_SKIPPED`（特殊标记，下游节点忽略）
- 默认分支：仅在所有条件分支都未匹配时激活

#### MergeAstVisitor - 数据合并节点

多路输入数据的聚合策略。

```typescript
@Injectable()
export class MergeAstVisitor {
    @Handler(MergeAst)
    handler(ast: MergeAst, ctx: any): Observable<NodeEvent> {
        return new Observable(obs => {
            let inputs = ast.inputs || [];
            if (!Array.isArray(inputs)) inputs = [inputs];

            const result = this.merge(inputs, ast.mode);

            obs.next({ type: 'node_emit', id: ast.id, property: 'result', value: result });
            obs.next({ type: 'node_emit', id: ast.id, property: 'totalCount', value: result.length });
            obs.complete();
        });
    }

    private merge(inputs: any[], mode: MergeMode): any[] {
        switch (mode) {
            case 'append':       // 扁平化拼接
                return inputs.flat();

            case 'combine':      // 按索引组合成对象
                const arrays = inputs.map(input => Array.isArray(input) ? input : [input]);
                const maxLen = Math.max(...arrays.map(arr => arr.length));
                const result: any[] = [];
                for (let i = 0; i < maxLen; i++) {
                    const combined: Record<number, any> = {};
                    arrays.forEach((arr, idx) => {
                        if (i < arr.length) combined[idx] = arr[i];
                    });
                    result.push(combined);
                }
                return result;

            case 'chooseBranch': // 选择第一个非空分支
                for (const input of inputs) {
                    const arr = Array.isArray(input) ? input : [input];
                    if (arr.length > 0 && arr.some(v => v != null)) {
                        return arr;
                    }
                }
                return [];

            case 'wait':        // 等待所有分支（默认为 append）
            default:
                return inputs.flat();
        }
    }
}
```

**合并模式对比**：

| 模式 | 输入示例 | 输出结果 |
|------|----------|----------|
| `append` | `[[1,2], [3,4]]` | `[1,2,3,4]` |
| `combine` | `[[1,2], [3,4,5]]` | `[{0:1, 1:3}, {0:2, 1:4}, {1:5}]` |
| `chooseBranch` | `[[], [1,2], [3]]` | `[1,2]` |
| `wait` | `[[1,2], [3,4]]` | `[1,2,3,4]` |

#### ShareAstVisitor - 群聊/消息共享节点

收集和组织对话历史，用于多 Agent 协作场景。

```typescript
@Injectable()
export class ShareAstVisitor {
    @Handler(ShareAst)
    handler(ast: ShareAst): Observable<NodeEvent> {
        return new Observable(obs => {
            // 1. 继承之前的对话历史
            const currentHistory = Array.isArray(ast.previousHistory) && ast.previousHistory.length > 0
                ? [...ast.previousHistory]
                : [];

            // 2. 添加当前消息
            currentHistory.push({
                role: ast.username || '未知角色',
                content: ast.prompt,
                timestamp: new Date().toISOString()
            });

            // 3. 输出结构化历史
            obs.next({ type: 'node_emit', id: ast.id, property: 'chatHistory', value: currentHistory });

            // 4. 输出格式化文本（用于 LLM 上下文）
            const formatted = currentHistory
                .map(msg => `【${msg.role}】${msg.content}`)
                .join('\n\n---\n\n');
            obs.next({ type: 'node_emit', id: ast.id, property: 'formattedHistory', value: formatted });

            obs.complete();
        });
    }
}
```

**输出属性**：
- `chatHistory` - 结构化对话历史（`ChatMessage[]`）
- `formattedHistory` - 格式化文本（用于 LLM Prompt）

### 2. 远程执行节点

所有微博采集、NLP 分析、LLM 调用、存储操作节点均通过 `executeRemote()` 委托给后端执行：

```typescript
// 典型远程执行节点模式
@Injectable()
export class WeiboKeywordSearchBrowserVisitor {
  @Handler(WeiboKeywordSearchAst)
  handler(ast: WeiboKeywordSearchAst, ctx: any): Observable<NodeEvent> {
    return executeRemote(ast, ctx);
  }
}
```

**为什么需要远程执行？**
1. **安全性**：微博 API 调用需要 Cookie/Token，不能暴露在前端
2. **性能**：NLP 分析、数据库操作在服务器端效率更高
3. **资源限制**：浏览器无法直接访问 PostgreSQL/Redis/RabbitMQ
4. **跨域限制**：微博 Ajax API 存在 CORS 限制

## 节点注册机制

所有 Visitor 通过 `src/index.ts` 导入自动注册到 DI 容器（基于 `@Injectable()` 装饰器）：

```typescript
// src/index.ts
import './WeiboLoginBrowserVisitor.js';
import './WeiboKeywordSearchBrowserVisitor.js';
import './LoopAstVisitor.js';
// ... 35 个 Visitor

// 导入即注册，无需显式调用
```

**注册原理**：
1. `@Injectable()` 装饰器标记类为可注入服务
2. `@Handler(AstClass)` 装饰器将 Visitor 绑定到 AST 类型
3. `@sker/core` 的 `root` 注入器在模块加载时自动收集元数据
4. `@sker/workflow` 的 `VisitorExecutor` 根据 AST 类型动态查找对应 Visitor

## 执行流程示例

### 场景：微博关键词搜索 → NLP 分析

```typescript
// 1. 用户在前端工作流编辑器中创建节点
const searchNode = new WeiboKeywordSearchAst();
searchNode.keyword = '人工智能';
searchNode.limit = 50;

const nlpNode = new PostNLPAnalyzerAst();

// 2. 连接节点（searchNode.output → nlpNode.input）
// 3. 调度器执行 searchNode

// 4. WeiboKeywordSearchBrowserVisitor 处理
handler(searchNode, workflowGraph): Observable<NodeEvent> {
    // 调用后端 API: POST /api/workflow/execute
    // 请求体: { ast: searchNode, workflow: workflowGraph }
    return executeRemote(searchNode, workflowGraph);
}

// 5. 后端通过 SSE 推送事件
// → node_running: { id: 'node-1', data: searchNode }
// → node_emit: { id: 'node-1', property: 'posts', value: [...50个微博] }
// → node_success: { id: 'node-1', data: searchNode }

// 6. 前端监听 SSE，同步更新 searchNode.posts (BehaviorSubject)
// 7. 调度器检测到 nlpNode 的依赖已满足，开始执行
// 8. PostNLPAnalyzerBrowserVisitor 同样通过 executeRemote() 调用后端
// 9. 后端执行 NLP 分析，再次通过 SSE 推送结果
```

## 依赖关系

```
@sker/workflow-browser
├── @sker/core                # DI 容器（@Injectable, root）
├── @sker/workflow            # 工作流引擎（@Handler, NodeEvent, Ast）
├── @sker/workflow-ast        # AST 节点定义（WeiboKeywordSearchAst 等）
├── @sker/sdk                 # API 客户端（WorkflowController）
└── rxjs                      # 响应式流（Observable）
```

## 添加新的浏览器端 Visitor

### 步骤 1：确定执行模式

**选择远程执行**（如果满足以下任意条件）：
- 需要访问后端资源（数据库/消息队列/文件系统）
- 需要调用外部 API（微博/OpenAI/高德地图）
- 需要敏感信息（Cookie/Token/API Key）
- 计算密集型任务（大规模 NLP/数据分析）

**选择本地执行**（如果满足以下所有条件）：
- 纯逻辑控制（循环/分支/合并）
- 无需后端资源
- 低延迟要求（避免网络往返）

### 步骤 2：创建 Visitor 类

**远程执行模式**：

```typescript
// src/MyNewNodeBrowserVisitor.ts
import { Injectable } from '@sker/core';
import { Handler, NodeEvent } from '@sker/workflow';
import { MyNewNodeAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class MyNewNodeBrowserVisitor {
  @Handler(MyNewNodeAst)
  handler(ast: MyNewNodeAst, ctx: any): Observable<NodeEvent> {
    return executeRemote(ast, ctx);
  }
}
```

**本地执行模式**：

```typescript
// src/MyLocalNodeVisitor.ts
import { Injectable } from '@sker/core';
import { Handler, NodeEvent } from '@sker/workflow';
import { MyLocalNodeAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';

@Injectable()
export class MyLocalNodeVisitor {
  @Handler(MyLocalNodeAst)
  handler(ast: MyLocalNodeAst, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
      ast.state = 'running';
      obs.next({ type: 'node_runing', id: ast.id, data: ast });

      // 执行本地逻辑
      const result = this.doSomething(ast.input);

      // 发射输出属性
      obs.next({ type: 'node_emit', id: ast.id, property: 'output', value: result });

      ast.state = 'success';
      obs.next({ type: 'node_success', id: ast.id, data: ast });
      obs.complete();
    });
  }

  private doSomething(input: any): any {
    // 本地处理逻辑
    return input;
  }
}
```

### 步骤 3：注册到 index.ts

```typescript
// src/index.ts
import './MyNewNodeBrowserVisitor.js';
// 或
import './MyLocalNodeVisitor.js';
```

### 步骤 4：配套后端 Visitor（仅远程执行）

如果是远程执行节点，需要在 `@sker/workflow-run` 中实现对应的后端 Visitor：

```typescript
// packages/workflow-run/src/MyNewNodeVisitor.ts
import { Injectable } from '@sker/core';
import { Handler, NodeEvent } from '@sker/workflow';
import { MyNewNodeAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';

@Injectable()
export class MyNewNodeVisitor {
  @Handler(MyNewNodeAst)
  handler(ast: MyNewNodeAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
      $input.subscribe({
        next: (inputData) => {
          ast.emitCount += 1;
          if (inputData) {
            Object.keys(inputData).forEach(key => {
              (ast as any)[key] = inputData[key];
            });
          }
        },
        complete: () => {
          // 后端实际执行逻辑（数据库操作/API 调用等）
          // ...
        }
      });
    });
  }
}
```

## 最佳实践

### 1. 错误处理

```typescript
handler(ast: MyAst, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
        try {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            // 执行逻辑
            const result = this.process(ast.input);

            obs.next({ type: 'node_emit', id: ast.id, property: 'output', value: result });
            ast.state = 'success';
            obs.next({ type: 'node_success', id: ast.id, data: ast });
            obs.complete();
        } catch (error) {
            ast.state = 'error';
            ast.error = error.message;
            obs.next({ type: 'node_error', id: ast.id, data: ast, error });
            obs.error(error); // 通知调度器
        }
    });
}
```

### 2. 异步操作（Promises）

```typescript
handler(ast: MyAst, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
        ast.state = 'running';
        obs.next({ type: 'node_runing', id: ast.id, data: ast });

        this.asyncProcess(ast.input)
            .then(result => {
                obs.next({ type: 'node_emit', id: ast.id, property: 'output', value: result });
                ast.state = 'success';
                obs.next({ type: 'node_success', id: ast.id, data: ast });
                obs.complete();
            })
            .catch(error => {
                ast.state = 'error';
                obs.next({ type: 'node_error', id: ast.id, data: ast, error });
                obs.error(error);
            });
    });
}

private async asyncProcess(input: any): Promise<any> {
    // 异步处理逻辑
    return input;
}
```

### 3. 多属性输出

```typescript
handler(ast: MyAst, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
        ast.state = 'running';
        obs.next({ type: 'node_runing', id: ast.id, data: ast });

        const { data, metadata } = this.process(ast.input);

        // 按顺序发射多个属性
        obs.next({ type: 'node_emit', id: ast.id, property: 'data', value: data });
        obs.next({ type: 'node_emit', id: ast.id, property: 'count', value: data.length });
        obs.next({ type: 'node_emit', id: ast.id, property: 'metadata', value: metadata });

        ast.state = 'success';
        obs.next({ type: 'node_success', id: ast.id, data: ast });
        obs.complete();
    });
}
```

### 4. 取消支持

```typescript
handler(ast: MyAst, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
        let cancelled = false;

        const process = async () => {
            ast.state = 'running';
            obs.next({ type: 'node_runing', id: ast.id, data: ast });

            for (let i = 0; i < 100; i++) {
                if (cancelled) break; // 检查取消标志

                await this.processItem(i);
                obs.next({ type: 'node_emit', id: ast.id, property: 'progress', value: i + 1 });
            }

            if (!cancelled) {
                ast.state = 'success';
                obs.next({ type: 'node_success', id: ast.id, data: ast });
                obs.complete();
            }
        };

        process();

        // 返回清理函数
        return () => {
            cancelled = true;
            ast.state = 'cancelled';
        };
    });
}
```

## 调试技巧

### 1. 启用 SSE 日志

```typescript
// 在 executeRemote() 中添加日志
export function executeRemote(ast: Ast, parent: WorkflowGraphAst, input = {}): Observable<NodeEvent> {
    const controller = root.get(WorkflowController);
    return controller.execute({ ast, workflow: parent, input }).pipe(
        tap(event => console.log(`[SSE] ${event.type}:`, event)), // 添加此行
    );
}
```

### 2. 检查 AST 状态同步

```typescript
handler(ast: MyAst, ctx: any): Observable<NodeEvent> {
    return executeRemote(ast, ctx).pipe(
        tap(event => {
            if (event.type === 'node_emit') {
                console.log(`[${ast.id}] ${event.property} =`, event.value);
                console.log(`[${ast.id}] AST.${event.property} =`, ast[event.property]); // 验证同步
            }
        })
    );
}
```

### 3. 监听完整生命周期

```typescript
handler(ast: MyAst, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
        console.log('[Lifecycle] Start:', ast.id);

        ast.state = 'running';
        obs.next({ type: 'node_runing', id: ast.id, data: ast });
        console.log('[Lifecycle] Running:', ast.id);

        // ... 执行逻辑

        ast.state = 'success';
        obs.next({ type: 'node_success', id: ast.id, data: ast });
        console.log('[Lifecycle] Success:', ast.id);

        obs.complete();
        console.log('[Lifecycle] Complete:', ast.id);
    });
}
```

## 性能优化

### 1. 减少远程调用

对于简单的数据转换逻辑，优先考虑本地执行：

```typescript
// 错误示例（不必要的远程调用）
@Handler(SimpleMapAst)
handler(ast: SimpleMapAst, ctx: any) {
    return executeRemote(ast, ctx); // 浪费网络往返
}

// 正确示例（本地执行）
@Handler(SimpleMapAst)
handler(ast: SimpleMapAst, ctx: any) {
    return new Observable(obs => {
        const result = ast.input.map(item => item * 2);
        obs.next({ type: 'node_emit', id: ast.id, property: 'output', value: result });
        obs.complete();
    });
}
```

### 2. 批量操作

使用 `LoopAst` 的 `batchSize` 和 `delay` 参数避免频繁调用：

```typescript
// 配置 Loop 节点
loopAst.items = [1, 2, 3, ..., 1000];
loopAst.batchSize = 50;   // 每批 50 个
loopAst.delay = 100;      // 批次间延迟 100ms
```

### 3. 缓存远程结果

在 AST 类中添加缓存字段：

```typescript
class MyCachedAst extends Ast {
    @Input() input!: string;
    @Output() output!: any;

    private cache = new Map<string, any>();

    getCachedOutput(key: string): any | undefined {
        return this.cache.get(key);
    }

    setCachedOutput(key: string, value: any): void {
        this.cache.set(key, value);
    }
}

// Visitor 中使用缓存
handler(ast: MyCachedAst, ctx: any): Observable<NodeEvent> {
    const cached = ast.getCachedOutput(ast.input);
    if (cached) {
        return of({ type: 'node_emit', id: ast.id, property: 'output', value: cached });
    }
    return executeRemote(ast, ctx);
}
```

## 总结

`@sker/workflow-browser` 是工作流引擎在浏览器端的执行层，采用混合执行架构：

- **远程代理**：微博采集、NLP、LLM、存储等需要后端资源的节点
- **本地执行**：Loop/Switch/Merge/Share 等纯逻辑控制流节点

关键设计：

1. **统一执行接口**：所有 Visitor 返回 `Observable<NodeEvent>`
2. **SSE 实时同步**：通过 `executeRemote()` + `WorkflowController` 实现前后端状态同步
3. **自动注册机制**：基于 `@Injectable()` + `@Handler()` 装饰器的 DI 容器
4. **RxJS 响应式流**：天然支持异步、取消、错误传播

添加新节点只需 3 步：

1. 创建 Visitor 类（选择远程或本地模式）
2. 使用 `@Handler(AstClass)` 绑定 AST 类型
3. 在 `index.ts` 导入注册
