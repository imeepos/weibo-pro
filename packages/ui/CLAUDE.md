# @sker/ui - 企业级 React UI 组件库

Weibo-Pro 的核心 UI 组件库，集成 Radix UI、Plate.js、ECharts、React Flow 等现代化前端技术栈。

## 目录结构

```
packages/ui/src/
├── components/
│   ├── ui/              # 基础 UI 组件（Radix UI + shadcn/ui）
│   ├── workflow/        # 工作流可视化组件（React Flow）
│   ├── editor/          # 富文本编辑器组件（Plate.js）
│   ├── blocks/          # 业务复合组件
│   ├── weibo/           # 微博相关业务组件
│   └── mobile/          # 移动端组件
├── hooks/               # React Hooks 工具集
├── lib/                 # 工具函数库
├── constants/           # 常量定义
└── styles/              # 全局样式（TailwindCSS v4）
```

## 核心依赖

### UI 框架
- **Radix UI** - 无样式可访问性组件原语（Accordion, Dialog, Dropdown 等）
- **Class Variance Authority (CVA)** - 类型安全的变体管理
- **TailwindCSS v4** - 原子化 CSS（使用 `@import` + `@theme` 新语法）
- **Framer Motion** - 动画库

### 富文本编辑器
- **Plate.js v52** - 基于 Slate 的富文本编辑器框架
- **Lexical** - Meta 开源的编辑器框架
- 50+ 插件：AI、Markdown、代码块、表格、公式、Excalidraw 等

### 数据可视化
- **ECharts** - 图表库（echarts-for-react）
- **Recharts** - React 图表库
- **Vis.js** - 网络拓扑图
- **React Force Graph 3D** - 3D 力导向图

### 工作流编排
- **@xyflow/react** (React Flow) - 可视化流程图编辑器
- **react-dnd** - 拖拽功能

### 其他
- **Zod v4** - 数据校验
- **React Hook Form** - 表单管理
- **Zustand** - 轻量级状态管理
- **Sonner** - Toast 通知
- **Lucide React** - 图标库

## 组件分类

### 1. 基础 UI 组件 (components/ui/)

#### 1.1 表单组件
- **Button** - 按钮（6 变体：default/destructive/outline/secondary/ghost/link + 3 尺寸）
- **Input** - 文本输入框
- **Textarea** - 多行文本
- **Select** - 选择器（Radix UI）
- **NativeSelect** - 原生 select
- **Checkbox** - 复选框
- **RadioGroup** - 单选按钮组
- **Switch** - 开关
- **Slider** - 滑块
- **InputOtp** - OTP 验证码输入
- **DatePicker** - 日期选择器（react-day-picker）
- **DateRangeField** - 日期范围选择器
- **Form** / **FormField** - 表单容器（react-hook-form）

#### 1.2 数据展示
- **Table** - 表格
- **Card** - 卡片（Header/Title/Description/Content/Footer）
- **Badge** - 徽章
- **Avatar** - 头像
- **Skeleton** - 骨架屏
- **Empty** / **EmptyState** - 空状态
- **Statistic** - 统计数值
- **StatisticsCard** - 统计卡片
- **MetricCard** - 指标卡片
- **Trend** - 趋势指示器
- **CountUp** - 数字动画
- **SentimentIndicator** - 情感指示器
- **StatusBadge** / **StatusIcon** - 状态徽章/图标
- **PerformanceHud** - 性能监控面板

#### 1.3 图表组件
- **Chart** - Recharts 容器（ChartContainer/ChartTooltip/ChartLegend）
- **Echart** - ECharts 封装（主题支持）
- **EchartNative** - 原生 ECharts
- **WordCloud** - 词云（echarts-wordcloud）
- **TimeSeriesChart** - 时序图表
- **GeoHeatMap** - 地理热力图（高德地图）
- **NetworkGraph** - 网络拓扑图（Vis.js）
- **ForceGraph3d** - 3D 力导向图
- **ChartState** - 图表状态管理

#### 1.4 导航组件
- **Breadcrumb** - 面包屑
- **Tabs** - 选项卡
- **Menubar** - 菜单栏
- **NavigationMenu** - 导航菜单
- **Sidebar** - 侧边栏
- **Pagination** - 分页器
- **SimplePagination** - 简单分页

#### 1.5 反馈组件
- **Dialog** - 对话框
- **AlertDialog** - 确认对话框
- **Sheet** - 抽屉（从边缘滑入）
- **Drawer** - 抽屉（vaul）
- **Popover** - 弹出层
- **Tooltip** - 工具提示
- **HoverCard** - 悬浮卡片
- **ContextMenu** - 右键菜单
- **DropdownMenu** - 下拉菜单
- **Sonner** - Toast 通知（sonner）
- **Alert** - 警告提示
- **Progress** - 进度条

#### 1.6 布局组件
- **Separator** - 分割线
- **ScrollArea** - 滚动区域
- **Collapsible** - 折叠面板
- **Accordion** - 手风琴
- **Resizable** - 可调整大小容器（react-resizable-panels）
- **AspectRatio** - 纵横比容器
- **Carousel** - 轮播图（embla-carousel）

#### 1.7 工具组件
- **Command** - 命令面板（cmdk）
- **SearchInput** - 搜索输入框
- **FilterBar** - 过滤栏
- **Kbd** - 键盘快捷键显示
- **Spinner** - 加载动画
- **IconPicker** - 图标选择器
- **MediaPicker** - 媒体选择器
- **ImageEditor** - 图片编辑器
- **ImageUploadPreview** - 图片上传预览
- **MarkdownViewer** - Markdown 查看器
- **Legend** - 图例

#### 1.8 业务组件
- **LlmProviderSelector** - LLM 提供商选择器
- **LlmModelSelector** - LLM 模型选择器
- **PersonaSelector** - 角色选择器
- **EventSelector** - 事件选择器
- **ScheduleCard** / **ScheduleForm** - 调度卡片/表单
- **DynamicOutputsDialog** - 动态输出对话框

### 2. 富文本编辑器 (components/editor/)

#### 2.1 核心组件
- **Editor** - Plate.js 编辑器（完整版）
- **EditorStatic** - 静态只读编辑器
- **MarkdownEditor** - Markdown 编辑器
- **AiChatEditor** - AI 对话编辑器

#### 2.2 插件系统（50+ 插件）
EditorKit 集成以下插件：

**AI 增强**
- `AIKit` - AI 辅助写作（AI 菜单、工具栏按钮）

**基础编辑**
- `BasicBlocksKit` - 基础块（段落、标题、引用、代码）
- `BasicMarksKit` - 基础标记（粗体、斜体、下划线、删除线）
- `BasicNodesKit` - 基础节点
- `BlockMenuKit` - 块菜单（/ 命令）
- `SlashKit` - 斜杠命令
- `AutoformatKit` - 自动格式化（Markdown 快捷输入）

**富媒体**
- `MediaKit` - 媒体（图片、视频、音频、文件）
- `ExcalidrawKit` - Excalidraw 白板
- `EmojiKit` - Emoji 表情
- `MathKit` - 数学公式（KaTeX）

**高级块**
- `TableKit` - 表格
- `CodeBlockKit` - 代码块（语法高亮）
- `CalloutKit` - 提示框
- `ToggleKit` - 折叠块
- `ColumnKit` - 分栏布局
- `TocKit` - 目录

**格式化**
- `AlignKit` - 对齐
- `FontKit` - 字体（颜色、大小、背景色）
- `LineHeightKit` - 行高
- `IndentKit` - 缩进
- `ListKit` - 列表（有序、无序、任务）

**协作**
- `CommentKit` - 评论
- `DiscussionKit` - 讨论
- `CursorOverlayKit` - 光标叠加（实时协作）

**工具栏**
- `FixedToolbarKit` - 固定工具栏
- `FloatingToolbarKit` - 浮动工具栏

**其他**
- `LinkKit` - 链接
- `MentionKit` - @提及
- `DateKit` - 日期插入
- `DndKit` - 拖拽排序
- `DocxKit` - DOCX 导入导出
- `MarkdownKit` - Markdown 解析
- `ExitBreakKit` - 退出块快捷键
- `BlockPlaceholderKit` - 占位符
- `SuggestionKit` - 自动建议

#### 2.3 节点组件（Node Components）
每个插件对应静态和动态两个节点组件：
- `*Node.tsx` - 可编辑节点
- `*NodeStatic.tsx` - 只读节点

示例：
- `BlockquoteNode` / `BlockquoteNodeStatic`
- `CodeBlockNode` / `CodeBlockNodeStatic`
- `TableNode` / `TableNodeStatic`
- `MediaImageNode` / `MediaImageNodeStatic`

### 3. 工作流组件 (components/workflow/)

基于 React Flow 的可视化工作流编辑器。

#### 3.1 画布组件
- **WorkflowCanvas** - 工作流画布容器（ReactFlow 封装）
  - 支持节点拖拽、连线、缩放、平移
  - 多选、框选、批量操作
  - 快照功能、网格背景
- **WorkflowCanvasControls** - 画布控制器（缩放、适应视图）
- **WorkflowMinimap** - 小地图
- **WorkflowEmptyState** - 空状态提示

#### 3.2 节点组件
- **WorkflowNode** - 工作流节点（通用容器）
- **WorkflowGraphNode** - 图形节点（AST 节点渲染）
- **WorkflowNodeSelector** - 节点选择器（侧边栏）

#### 3.3 边组件
- **WorkflowEdge** - 工作流连线
- **EdgeConfigDialog** - 边配置对话框
- **EdgeModeSelector** - 边模式选择器（数据/条件/循环）
- **EdgeDataMapping** - 数据映射配置
- **EdgeConditionConfig** - 条件配置
- **EdgeLoopConfig** - 循环配置
- **EdgePreview** - 边预览

#### 3.4 控制组件
- **WorkflowControls** - 工具栏（运行、保存、导出）
- **WorkflowMenubar** - 菜单栏（文件、编辑、视图）
- **WorkflowContextMenu** - 右键菜单
- **WorkflowProgress** - 执行进度条

#### 3.5 属性面板
- **WorkflowPropertyPanel** - 属性面板
- **WorkflowPropertyDrawer** - 属性抽屉（移动端）
- **WorkflowFormField** - 表单字段（支持多种输入类型）
- **WorkflowSettingsDialog** - 工作流设置对话框

#### 3.6 Hooks
- `useWorkflowCanvas` - 画布状态管理
- `useWorkflowNodes` - 节点管理
- `useWorkflowEdges` - 边管理
- `useWorkflowActions` - 操作管理（复制、粘贴、删除、对齐）

### 4. 业务复合组件 (components/blocks/)

- **WorkflowList** - 工作流列表
- **WorkflowRunList** - 工作流运行记录列表
- **WorkflowScheduleList** - 工作流调度列表
- **WorkflowNodeSelector** - 节点选择器（业务版本）
- **WorkflowSelector** - 工作流选择器

### 5. React Hooks (hooks/)

#### 5.1 状态管理
- `useBoolean` - 布尔状态管理
- `useToggle` - 切换状态
- `useCounter` - 计数器
- `usePrevious` - 获取上一次值
- `useLatest` - 获取最新值

#### 5.2 生命周期
- `useMount` - 组件挂载
- `useUnmount` - 组件卸载
- `useMounted` - 是否已挂载
- `useUpdate` - 强制更新
- `useUpdateEffect` - 更新时执行（跳过首次）

#### 5.3 副作用
- `useDebounce` / `useDebounceFn` / `useDebounceEffect` - 防抖
- `useThrottle` / `useThrottleFn` / `useThrottleEffect` - 节流
- `useInterval` - 定时器
- `useTimeout` - 延时器
- `useEffectEvent` - 稳定的事件回调
- `useCreation` - useMemo/useRef 替代（性能优化）
- `useCustomCompareEffect` - 自定义比较的 useEffect
- `useDeepCompareEffect` / `useDeepCompareLayoutEffect` - 深比较

#### 5.4 DOM/事件
- `useClickAway` - 点击外部区域
- `useClickAnyWhere` - 全局点击
- `useEventListener` - 事件监听器
- `useHover` - 悬停状态
- `useInViewport` - 元素可见性
- `useEffectWithTarget` - 带目标元素的 useEffect

#### 5.5 浏览器
- `useIsHydrated` - 是否已水合（SSR）
- `useIsMobile` - 是否移动端
- `useIsTouchDevice` - 是否触屏设备
- `useIsOnline` - 网络状态
- `useIsMatchMedia` - 媒体查询匹配
- `useHash` - URL hash

#### 5.6 工具
- `useMemoizedFn` - 持久化函数引用
- `useLockFn` - 防止并发调用
- `useWhyDidYouUpdate` - 调试更新原因
- `useUploadFile` - 文件上传

#### 5.7 图表相关
- `useEchartTheme` - ECharts 主题管理
- `useChinaMap` - 中国地图数据加载
- `useForceGraphNodeRenderer` - 力导向图节点渲染器
- `useForceGraphLinkRenderer` - 力导向图连线渲染器

#### 5.8 布局
- `useIsomorphicLayoutEffect` - 同构 layoutEffect

### 6. 工具函数 (lib/)

- `cn()` - 类名合并工具（clsx + tailwind-merge）
- `createContext()` - 类型安全的 Context 创建
- `createEffectWithTarget()` - 创建带目标元素的 Effect Hook
- `id()` - ID 生成器
- `isBrowser()` - 浏览器环境检测
- `markdownJoinerTransform()` - Markdown 连接器转换
- **图算法工具**：
  - `graph-community-detector.ts` - 社区检测（Louvain 算法）
  - `graph-focus-system.ts` - 图聚焦系统
  - `graph-geometry-utils.ts` - 几何计算工具
  - `graph-performance-optimizer.ts` - 图性能优化器

## 样式系统

### TailwindCSS v4（新语法）

使用 `@import` + `@theme` + `@plugin` 替代传统配置文件：

```css
@import "tailwindcss";

@plugin "tailwind-scrollbar-hide";
@plugin "@tailwindcss/typography";
@source "../../../apps/**/*.{tsx}";
@source "../../workflow-ui/**/*.{tsx}";
@source "../**/*.{tsx}";

@import "tw-animate-css";
@import '@xyflow/react/dist/style.css';

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... */
}
```

### 设计系统

#### 主题变量（CSS Variables）
- **语义化颜色**：`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`
- **交互颜色**：`border`, `input`, `ring`
- **图表色板**：`chart-1` ~ `chart-10`（10 色渐变）
- **侧边栏**：`sidebar-*`（6 个变量）
- **工作流节点状态**：`node-running`, `node-success`, `node-error`, `node-idle`, `node-emitting`
- **工作流画布**：`workflow-canvas-bg`, `workflow-grid-color`, `workflow-handle-*`, `workflow-port-*`

#### 圆角（Border Radius）
```css
--radius: 0.625rem; /* 10px */
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

#### 深色模式
`.dark` 类名自动应用深色主题，所有变量使用 OKLCH 色彩空间。

### 组件变体管理（CVA）

使用 Class Variance Authority 实现类型安全的变体：

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border bg-background",
        // ...
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
  }
)
```
