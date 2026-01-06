---
name: development-principles
description: 开发原则记错本。记录开发过程中犯过的错误和对应的原则，避免重蹈覆辙。
---

# 开发原则记错本

## 原则：任务范围边界

**只改指定范围，不跨界**

### 错误案例

用户要求："更新 UI 组件以修复 ExcelUploadAst 渲染错误"

错误行为：同时修改了 AST 定义和 UI 渲染器

正确做法：只修改 `ExcelUploadAstRender.tsx`，不动 `ExcelUploadAst.ts`

### 通用规则

| 用户指定范围 | 只改这些 | 不动这些 |
|------------|---------|---------|
| "更新 UI" | `*Render.tsx` | AST 定义、Visitor |
| "修复节点逻辑" | `*Visitor.ts` | UI、AST 类型 |
| "修改类型" | `*Ast.ts` | Visitor、UI 渲染 |
| "修复工作流执行" | `@sker/workflow` | AST、UI |

### 检查清单

修改前确认：
1. [ ] 用户明确指定的文件/包是什么？
2. [ ] 我的改动是否超出了这个范围？
3. [ ] 如果需要改动其他层，**先询问用户**

### 为什么重要

- AST 定义 = 前后端共享的契约
- Visitor = 后端执行逻辑
- UI Render = 前端展示逻辑

三层解耦，修改一层不应波及其他层。
