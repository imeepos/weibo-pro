# @sker/workflow-ui

工作流可视化编辑器 - 基于 React Flow 的节点渲染包

## 包概览

`@sker/workflow-ui` 是工作流系统的前端渲染层，负责将 AST 节点转换为可交互的 React 组件。它是 `@sker/workflow` 和 `@sker/workflow-ast` 的视觉化呈现，使用 `@Render` 装饰器将每个 AST 节点映射到对应的 React 渲染器。

**核心职责**：
- 节点渲染：通过 `@Render` 装饰器为每个 AST 类型提供 React 组件
- 可视化编辑：基于 React Flow 的画布编辑器（WorkflowCanvas）
- 状态同步：AST ↔ React Flow 双向转换
- 交互控制：节点操作、连线验证、键盘快捷键

## 技术栈

- **React 19** - UI 框架
- **@xyflow/react** - 可视化流程图库
- **Zustand** - 状态管理
- **Framer Motion** - 动画
- **Radix UI** - 无障碍组件
- **TailwindCSS** - 样式系统

## 目录结构

```
packages/workflow-ui/
├── src/
│   ├── renderers/              # 节点渲染器（核心）
│   │   ├── WeiboKeywordSearchAstRender.tsx
│   │   ├── PostNLPAnalyzerAstRender.tsx
│   │   ├── EventAutoCreatorAstRender.tsx
│   │   ├── LlmTextAgentAstRender.tsx
│   │   ├── WorkflowGraphAstRender.tsx
│   │   └── ... （46 个渲染器）
│   │
│   ├── components/             # React 组件
│   │   ├── nodes/             # 节点组件（BaseNode, GroupNode）
│   │   ├── edges/             # 边组件
│   │   ├── WorkflowCanvas/    # 主画布组件
│   │   ├── NodePalette/       # 节点面板
│   │   ├── PropertyPanel/     # 属性面板
│   │   ├── LeftDrawer/        # 左侧抽屉
│   │   └── execution/         # 执行器组件
│   │
│   ├── adapters/              # 适配器层
│   │   ├── metadata.ts        # 元数据提取（getNodeMetadata）
│   │   ├── flow-to-ast.ts     # React Flow → AST
│   │   ├── flow-ast-converter.ts  # AST → React Flow
│   │   └── index.ts
│   │
│   ├── store/                 # 状态管理
│   │   ├── workflow.store.ts  # 工作流状态
│   │   ├── selection.store.ts # 选择状态
│   │   ├── execution.store.ts # 执行状态
│   │   └── history.store.ts   # 历史记录
│   │
│   ├── hooks/                 # React Hooks
│   │   ├── useWorkflow.ts     # 工作流核心逻辑
│   │   ├── useAutoSave.ts     # 自动保存
│   │   ├── useWorkflowHistory.ts  # 撤销/重做
│   │   ├── useKeyboardShortcuts.ts  # 快捷键
│   │   └── useWorkflowExecution.ts  # 执行状态
│   │
│   ├── types/                 # TypeScript 类型定义
│   │   ├── node.types.ts      # 节点类型
│   │   ├── edge.types.ts      # 边类型
│   │   └── index.ts
│   │
│   ├── utils/                 # 工具函数
│   │   ├── cn.ts              # 类名合并
│   │   ├── validation.ts      # 验证逻辑
│   │   ├── layout.ts          # 自动布局（dagre）
│   │   ├── edgeValidator.ts   # 边验证
│   │   └── workflowFactory.ts # 工作流工厂
│   │
│   ├── context/               # React Context
│   │   └── workflow-operations.tsx
│   │
│   ├── core/                  # 核心逻辑
│   │   └── state-change-proxy.ts
│   │
│   ├── styles/                # 全局样式
│   │   └── globals.css
│   │
│   └── index.ts               # 公共 API 入口
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```
