# @sker/ui

企业级 React UI 组件库：集成 Radix UI、Plate.js（富文本）、ECharts/Recharts（可视化）、React Flow（工作流）等现代化前端技术栈。

## 核心职责

- **基础 UI 组件**：`components/ui/`（217 个文件，Radix UI + shadcn/ui 风格）覆盖表单、数据展示、图表、导航、反馈、布局、工具等类别
- **富文本编辑器**：`components/editor/`（Plate.js/Lexical）集成 50+ 插件（AI、Markdown、代码块、表格、公式、Excalidraw、协作等）
- **工作流组件**：`components/workflow/`（React Flow）提供可视化工作流画布、节点/边/属性面板/控制组件
- **业务复合组件**：`components/blocks/`（工作流列表、运行记录、调度列表等）
- **Hooks 工具集**：`hooks/`（48 个）覆盖状态管理、生命周期、副作用（防抖/节流）、DOM/事件、浏览器环境、图表等
- **工具函数与样式系统**：`lib/`（cn、图算法、graph-data-stream、graph-lod-manager）、`styles/globals.css`（Tailwind v4 主题变量）、`workers/`（Web Worker）

## 目录结构

```
packages/ui/src/
├── components/
│   ├── ui/              # 基础 UI 组件（Radix + shadcn/ui，217 个文件）
│   │   ├── button.tsx / input.tsx / select.tsx / checkbox.tsx ...   # 表单类
│   │   ├── card.tsx / table.tsx / badge.tsx / avatar.tsx ...        # 数据展示类
│   │   ├── chart.tsx / echart.tsx / network-graph.tsx ...           # 图表类
│   │   ├── dialog.tsx / sheet.tsx / drawer.tsx / tooltip.tsx ...    # 反馈类
│   │   ├── breadcrumb.tsx / tabs.tsx / sidebar.tsx / pagination.tsx # 导航类
│   │   ├── command.tsx / search-input.tsx / markdown-viewer.tsx     # 工具类
│   │   ├── index.ts    # 组件批量导出入口
│   │   └── ...
│   ├── editor/          # 富文本编辑器（Plate.js）
│   │   ├── editor-kit.tsx / editor-base-kit.tsx  # 编辑器完整版/基础版
│   │   ├── plugins/    # 50+ 插件（57 个文件）：AI、Markdown、代码块、表格、Excalidraw 等
│   │   ├── transforms.ts  # 编辑器转换工具
│   │   └── use-chat.ts    # AI 对话
│   ├── workflow/        # 工作流可视化组件（React Flow）
│   │   ├── workflow-canvas.tsx / workflow-node.tsx / workflow-edge.tsx
│   │   ├── workflow-property-panel.tsx / workflow-menubar.tsx / workflow-controls.tsx
│   │   ├── edge-*.tsx   # 边配置（模式/数据映射/条件/循环）
│   │   ├── hooks/       # use-workflow-canvas / use-workflow-nodes / use-workflow-edges / use-workflow-actions
│   │   ├── types/       # workflow-canvas.ts / workflow-nodes.ts
│   │   └── index.ts
│   ├── blocks/          # 业务复合组件：workflow-list、workflow-run-list、workflow-schedule-list、workflow-selector 等
│   └── mobile/          # 移动端组件（index.ts）
├── hooks/               # 48 个 React Hooks：useBoolean、useDebounce、useClickAway、useIsHydrated、useEchartTheme 等
├── lib/                 # 工具函数库
│   ├── utils.ts / cn.ts / create-context.tsx / id.ts / is-browser.ts
│   ├── graph-community-detector.ts / graph-geometry-utils.ts / graph-performance-optimizer.ts  # 图算法
│   ├── graph-data-stream/   # 图数据流
│   └── graph-lod-manager/   # 图 LOD 管理
├── constants/           # 常量定义（workflow.ts）
├── styles/              # globals.css（Tailwind v4 主题变量、深色模式、工作流/图表色板）
└── workers/             # Web Worker：force-simulation.worker.ts（力导向模拟）
```

> 说明：`components/weibo/` 目前为空目录；本包不包含具体业务页面（页面位于 apps/）。

## 边界

- **✅ 负责**：通用可复用的 UI 组件、富文本编辑器、数据可视化、工作流可视化组件、Hooks、样式系统与设计令牌（CSS 变量）
- **❌ 不负责**：工作流引擎逻辑与节点定义（属于 `@sker/workflow` / `@sker/workflow-ast`）、节点执行逻辑（属于 `@sker/workflow-run` / `@sker/workflow-browser`）、业务页面与业务状态管理（属于 apps/）、工作流画布专属渲染器（属于 `@sker/workflow-ui`）
- **对外依赖**：`@sker/sdk`、`@sker/workflow`；外部：react、radix-ui、@platejs/* + platejs + lexical、echarts/echarts-for-react、recharts、@xyflow/react、framer-motion、zustand、zod、react-hook-form、tailwind-merge、sonner、lucide-react、three、vis-network 等
- **被谁依赖**：`@sker/workflow-ui`；apps：`bigscreen`、`storybook`

---

## 组件分类速览

### 1. 基础 UI 组件（components/ui/）
- **表单**：Button、Input、Textarea、Select、NativeSelect、Checkbox、RadioGroup、Switch、Slider、InputOtp、DatePicker、DateRangeField、Form/FormField
- **数据展示**：Table、Card、Badge、Avatar、Skeleton、Empty/EmptyState、Statistic、StatisticsCard、MetricCard、Trend、CountUp、SentimentIndicator、StatusBadge/StatusIcon、PerformanceHud
- **图表**：Chart（Recharts）、Echart/EchartNative（ECharts）、WordCloud、TimeSeriesChart、GeoHeatMap、NetworkGraph、ForceGraph3d、ChartState
- **导航**：Breadcrumb、Tabs、Menubar、NavigationMenu、Sidebar、Pagination
- **反馈**：Dialog、AlertDialog、Sheet、Drawer、Popover、Tooltip、HoverCard、ContextMenu、DropdownMenu、Sonner、Alert、Progress
- **布局**：Separator、ScrollArea、Collapsible、Accordion、Resizable、AspectRatio、Carousel
- **工具**：Command、SearchInput、FilterBar、Kbd、Spinner、IconPicker、MediaPicker、ImageEditor、ImageUploadPreview、MarkdownViewer、Legend
- **业务**：LlmProviderSelector、LlmModelSelector、PersonaSelector、EventSelector、ScheduleCard/ScheduleForm、DynamicOutputsDialog

### 2. 富文本编辑器（components/editor/）
- **核心**：Editor（Plate.js 完整版）、EditorStatic（只读）、MarkdownEditor、AiChatEditor
- **插件系统（50+）**：AIKit、BasicBlocksKit、BasicMarksKit、MediaKit、ExcalidrawKit、EmojiKit、MathKit、TableKit、CodeBlockKit、CalloutKit、ToggleKit、ColumnKit、TocKit、AlignKit、FontKit、LineHeightKit、IndentKit、ListKit、CommentKit、DiscussionKit、CursorOverlayKit、FixedToolbarKit、FloatingToolbarKit、LinkKit、MentionKit、DateKit、DndKit、DocxKit、MarkdownKit、SuggestionKit 等
- **节点组件**：每个插件对应可编辑节点（`*Node.tsx`）与只读节点（`*NodeStatic.tsx`）

### 3. 工作流组件（components/workflow/）
- **画布**：WorkflowCanvas、WorkflowCanvasControls、WorkflowMinimap、WorkflowEmptyState
- **节点/边**：WorkflowNode、WorkflowGraphNode、WorkflowNodeSelector、WorkflowEdge、EdgeConfigDialog、EdgeModeSelector、EdgeDataMapping、EdgeConditionConfig、EdgeLoopConfig
- **控制**：WorkflowControls、WorkflowMenubar、WorkflowContextMenu、WorkflowProgress、WorkflowPropertyPanel、WorkflowPropertyDrawer、WorkflowFormField、WorkflowSettingsDialog
- **Hooks**：useWorkflowCanvas、useWorkflowNodes、useWorkflowEdges、useWorkflowActions

### 4. 业务复合组件（components/blocks/）
WorkflowList、WorkflowRunList、WorkflowScheduleList、WorkflowSelector、WorkflowNodeSelector

## 样式系统（Tailwind v4）

- 使用 `@import "tailwindcss"` + `@theme inline` 新语法，无传统配置文件
- **主题变量**：语义化颜色（background/foreground/primary/…）、图表色板（chart-1~10）、侧边栏（sidebar-*）、工作流节点状态色（node-running/node-success/node-error/…）、工作流画布色（workflow-canvas-bg、workflow-grid-color、workflow-handle-*、workflow-port-*）
- **深色模式**：`.dark` 类名自动应用深色主题，使用 OKLCH 色彩空间
- **圆角体系**：`--radius`（0.625rem）及其 sm/md/lg/xl 衍生值
