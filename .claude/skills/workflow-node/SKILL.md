---
name: workflow-node
description: 创建工作流 AST 节点、Handler 执行器和 UI 渲染器。当需要添加新的工作流节点、实现数据处理节点、或扩展工作流引擎功能时使用。
---

# 工作流节点开发

创建完整的工作流节点需要三个部分：AST 定义、Handler 执行器、UI 渲染器。

## 文件位置

- AST 节点：`packages/workflow-ast/src/YourNodeAst.ts`
- Handler：`packages/workflow-run/src/YourNodeVisitor.ts`
- Renderer：`packages/workflow-ui/src/renderers/YourNodeAstRender.tsx`

## AST 节点模板

```typescript
import { Ast, Input, Node, Output } from '@sker/workflow';
import type { SomeEntity } from '@sker/entities';

@Node({ title: '节点中文标题' })
export class YourNodeAst extends Ast {
  @Input({ title: '关键字', type: 'text' })
  keyword: string = '';

  @Input({ title: '页码', type: 'number' })
  page: number = 1;

  @Output({ title: '用户ID' })
  @Input({ title: '用户ID' })
  uid: string = '';

  @Output({ title: '结果列表' })
  results: SomeEntity[] = [];

  @Output({ title: '是否结束' })
  isEnd: boolean = false;

  type: 'YourNodeAst' = 'YourNodeAst';
}
```

## Handler 执行器模板

```typescript
import { Inject, Injectable, NoRetryError } from '@sker/core';
import { Handler } from '@sker/workflow';
import { YourNodeAst } from '@sker/workflow-ast';
import { useEntityManager, SomeEntity } from '@sker/entities';

@Injectable()
export class YourNodeVisitor {
  constructor(
    @Inject(SomeDependency) private dependency: SomeDependency
  ) {}

  @Handler(YourNodeAst)
  async visit(ast: YourNodeAst, ctx: any) {
    ast.state = 'running';

    try {
      if (!ast.keyword) {
        throw new NoRetryError('缺少必要参数: keyword');
      }

      await useEntityManager(async (m) => {
        const results = await m.find(SomeEntity, {
          where: { /* 查询条件 */ }
        });
        ast.results = results;
        ast.isEnd = results.length === 0;
      });

      ast.state = 'success';
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
    }

    return ast;
  }
}
```

## UI 渲染器模板

```tsx
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { YourNodeAst } from '@sker/workflow-ast';
import React from 'react';

const ConfigRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-400">{label}</span>
    <span className="text-slate-200 font-mono">{value}</span>
  </div>
);

const YourNodeComponent: React.FC<{ ast: YourNodeAst }> = ({ ast }) => (
  <div className="space-y-1.5 text-xs">
    <div className="font-medium text-slate-200 mb-1">节点标题</div>
    {ast.keyword && <ConfigRow label="关键词" value={ast.keyword} />}
    {!ast.keyword && <div className="text-slate-400 italic">等待输入...</div>}
  </div>
);

@Injectable()
export class YourNodeAstRender {
  @Render(YourNodeAst)
  render(ast: YourNodeAst) {
    return <YourNodeComponent ast={ast} />;
  }
}
```

## 命名规范

- AST 类名：`XxxAst`
- Visitor 类名：`XxxVisitor` 或 `XxxAstVisitor`
- Renderer 类名：`XxxAstRender`

## 装饰器说明

- `@Node({ title })`: 节点中文标题
- `@Input({ title, type })`: type 支持 'text', 'number', 'date'
- `@Input({ isMulti: true })`: 多值输入，多条边聚合为数组
- `@Output({ title })`: 输出属性

## 关键要点

1. **type 属性必须声明为字面量类型**
2. **Handler 必须设置 state**: 开始 `'running'`，结束 `'success'` 或 `'fail'`
3. **错误处理使用 `ast.setError()`**
4. **不可重试错误使用 `NoRetryError`**
5. **在各自的 index.ts 中导出新类**

## 参考实现

- `packages/workflow-ast/src/WeiboKeywordSearchAst.ts`
- `packages/workflow-run/src/WeiboKeywordSearchVisitor.ts`
- `packages/workflow-ui/src/renderers/WeiboKeywordSearchAstRender.tsx`
