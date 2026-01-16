# Workflow-UI UX 优化设计方案

## 基于 UI/UX Pro Max 的系统优化

本文档基于 UI/UX Pro Max 技能的方法论，对 @sker/workflow-ui 进行全面的 UX 优化设计。

---

## 📊 现状分析

### 现有优势
- ✅ **成熟架构**：React Flow + Zustand + 装饰器系统
- ✅ **功能完整**：46个节点渲染器、边验证器、工作流工厂
- ✅ **交互基础**：键盘快捷键（19个快捷键）、基本拖拽
- ✅ **专业工具**：命令式 API、自动布局、边验证

### 核心问题（基于 8 类优先级规则）

| 优先级 | 问题类别 | 具体问题 | 影响 |
|--------|----------|----------|------|
| **P1** | **Accessibility** | - 缺乏焦点管理<br>- 无 ARIA 标签<br>- 键盘导航不完整 | ❌ 无障碍访问受限<br>❌ 法规合规风险 |
| **P2** | **Touch & Interaction** | - 节点尺寸可能 < 44px<br>- 缺乏视觉反馈<br>- 错误状态不明确 | ❌ 操作困难<br>❌ 用户体验差 |
| **P3** | **Performance** | - 大工作流性能未知<br>- 无虚拟滚动<br>- 重新渲染频繁 | ❌ 大规模应用性能问题 |
| **P4** | **Layout & Responsive** | - 专为桌面设计<br>- 小屏幕体验差<br>- 布局固定 | ❌ 设备兼容性差 |
| **P5** | **Typography & Color** | - 缺乏统一设计系统<br>- 颜色对比度未知<br>- 字体层次不清 | ❌ 视觉一致性差 |
| **P6** | **Animation** | - 过渡效果缺失<br>- 加载状态简单<br>- 无微交互 | ❌ 交互反馈不足 |
| **P7** | **Style Selection** | - 视觉风格不够专业<br>- 数据密度高时易混乱 | ❌ 专业性不足 |
| **P8** | **Charts & Data** | - 数据流可视化缺失<br>- 调试信息展示不足 | ❌ 专业用户效率低 |

---

## 🎨 设计系统（Design System）

### 1. 色彩系统（Color System）

#### 主色调（Primary Palette）
```typescript
// 专业工作流编辑器色彩系统
export const WORKFLOW_COLORS = {
  // 主色系 - 蓝色（专业、信任）
  primary: {
    50: '#eff6ff',   // 背景
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // 主要操作
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',  // 文字
  },

  // 语义色系
  success: {
    50: '#f0fdf4',
    500: '#22c55e',  // 成功状态
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',  // 警告状态
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',  // 错误状态
    900: '#7f1d1d',
  },
  info: {
    50: '#f0f9ff',
    500: '#06b6d4',  // 信息提示
    900: '#164e63',
  },

  // 中性色系
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // 节点状态色
  node: {
    pending: '#94a3b8',   // 灰色
    running: '#3b82f6',   // 蓝色
    success: '#22c55e',   // 绿色
    error: '#ef4444',     // 红色
    warning: '#f59e0b',   // 黄色
  }
}
```

#### 使用规范
```typescript
// ✅ 正确使用示例
<Node className="bg-primary-500 text-white">
<Node className="border border-gray-200">
<Node className="bg-success-50 text-success-900">

// ❌ 避免使用
<Node style={{ backgroundColor: '#3b82f6' }}>
<Node className="bg-red-500"> // 使用语义色
```

### 2. 字体系统（Typography System）

#### 字体栈
```typescript
export const TYPOGRAPHY = {
  // 字体族
  fontFamily: {
    sans: [
      'Inter',           // 主要字体
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    mono: [
      '"Fira Code"',     // 代码字体
      'Consolas',
      '"Courier New"',
      'monospace',
    ].join(','),
  },

  // 字体大小
  fontSize: {
    xs: '12px',    // 标签、次要信息
    sm: '14px',    // 小按钮
    base: '16px',  // 正文
    lg: '18px',    // 小标题
    xl: '20px',    // 节点标题
    '2xl': '24px', // 面板标题
    '3xl': '30px', // 页面标题
  },

  // 行高
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  // 字重
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  }
}
```

#### 排版规范
```typescript
// 节点标题
.node-title {
  font-family: ${TYPOGRAPHY.fontFamily.sans};
  font-size: ${TYPOGRAPHY.fontSize.xl};
  font-weight: ${TYPOGRAPHY.fontWeight.semibold};
  line-height: ${TYPOGRAPHY.lineHeight.tight};
  color: ${WORKFLOW_COLORS.gray[900]};
}

// 节点描述
.node-description {
  font-family: ${TYPOGRAPHY.fontFamily.sans};
  font-size: ${TYPOGRAPHY.fontSize.sm};
  font-weight: ${TYPOGRAPHY.fontWeight.normal};
  line-height: ${TYPOGRAPHY.lineHeight.normal};
  color: ${WORKFLOW_COLORS.gray[600]};
}

// 端口标签
.port-label {
  font-family: ${TYPOGRAPHY.fontFamily.sans};
  font-size: ${TYPOGRAPHY.fontSize.xs};
  font-weight: ${TYPOGRAPHY.fontWeight.medium};
  line-height: ${TYPOGRAPHY.lineHeight.tight};
  color: ${WORKFLOW_COLORS.gray[700]};
}
```

### 3. 间距系统（Spacing System）

#### 8pt 网格系统
```typescript
export const SPACING = {
  0: '0px',
  1: '4px',    // 最小间距
  2: '8px',    // 紧凑间距
  3: '12px',   // 小间距
  4: '16px',   // 标准间距
  6: '24px',   // 中等间距
  8: '32px',   // 大间距
  12: '48px',  // 超大间距
  16: '64px',  // 巨大间距
}

// 组件内边距
const NODE_PADDING = '16px'  // 节点内边距
const PORT_SPACING = '8px'   // 端口间距
const LABEL_MARGIN = '4px'   // 标签边距

// 组件外边距
const NODE_GAP = '16px'      // 节点间距
const SECTION_GAP = '24px'    // 区块间距
```

### 4. 圆角系统（Border Radius）

```typescript
export const BORDER_RADIUS = {
  none: '0px',
  sm: '2px',        // 小组件
  base: '4px',      // 标准
  md: '6px',        // 卡片
  lg: '8px',        // 大卡片
  xl: '12px',       // 面板
  full: '9999px',   // 圆形
}

// 使用场景
const NODE_BORDER_RADIUS = BORDER_RADIUS.md  // 6px
const BUTTON_BORDER_RADIUS = BORDER_RADIUS.base  // 4px
const PANEL_BORDER_RADIUS = BORDER_RADIUS.lg  // 8px
```

### 5. 阴影系统（Shadow System）

```typescript
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
}

// 使用场景
const NODE_SHADOW = SHADOWS.base        // 默认节点
const SELECTED_NODE_SHADOW = SHADOWS.md  // 选中节点
const FLOATING_PANEL_SHADOW = SHADOWS.xl // 浮动面板
```

---

## 🚀 核心优化方案

### P1: Accessibility 优化（CRITICAL）

#### 1.1 焦点管理系统

```typescript
// 焦点管理器
class FocusManager {
  private focusHistory: string[] = []
  private currentFocus: string | null = null

  // 获取下一个可聚焦元素
  getNextFocusable(currentId: string, direction: 'forward' | 'backward'): string | null {
    const focusableElements = this.getFocusableElements()
    const currentIndex = focusableElements.indexOf(currentId)

    if (direction === 'forward') {
      return focusableElements[(currentIndex + 1) % focusableElements.length]
    } else {
      return focusableElements[(currentIndex - 1 + focusableElements.length) % focusableElements.length]
    }
  }

  // 获取所有可聚焦元素（节点、端口、按钮）
  getFocusableElements(): string[] {
    return [
      ...this.getAllNodeIds(),
      ...this.getAllPortIds(),
      ...this.getAllButtonIds(),
    ]
  }
}
```

#### 1.2 ARIA 标签系统

```typescript
// 节点 ARIA 标签
<Node
  role="button"
  aria-label={`${node.type} 节点，状态：${node.state}`}
  aria-describedby={`node-${id}-description`}
  aria-expanded={!isCollapsed}
  tabIndex={0}
>
  <div id={`node-${id}-description`} className="sr-only">
    {node.description || '无描述'}
  </div>
</Node>

// 端口 ARIA 标签
<Handle
  type="source"
  position="right"
  aria-label={`输出端口：${port.label}`}
  aria-describedby={`port-${id}-type`}
  role="button"
  tabIndex={0}
/>

<div id={`port-${id}-type`} className="sr-only">
  {isMulti ? '多值输出' : '单值输出'}
</div>
```

#### 1.3 键盘导航

```typescript
// 增强的键盘导航
const KeyboardNavigation = {
  // Tab 键遍历
  handleTab: (event: KeyboardEvent) => {
    if (event.shiftKey) {
      focusManager.focusPrevious()
    } else {
      focusManager.focusNext()
    }
  },

  // 箭头键在画布中导航
  handleArrowKeys: (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        focusManager.moveFocus('up')
        break
      case 'ArrowDown':
        focusManager.moveFocus('down')
        break
      case 'ArrowLeft':
        focusManager.moveFocus('left')
        break
      case 'ArrowRight':
        focusManager.moveFocus('right')
        break
    }
  },

  // Enter/Space 激活
  handleActivate: (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activateCurrentElement()
    }
  }
}
```

#### 1.4 屏幕阅读器支持

```typescript
// 实时状态播报
const LiveRegion = () => {
  const [message, setMessage] = useState('')

  // 监听节点状态变化并播报
  useEffect(() => {
    if (nodeStateChanged) {
      setMessage(`节点 ${nodeName} 状态变更为 ${nodeState}`)
      // 3秒后清空消息
      setTimeout(() => setMessage(''), 3000)
    }
  }, [nodeState])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
```

### P2: Touch & Interaction 优化（CRITICAL）

#### 2.1 触摸目标优化

```typescript
// 节点最小尺寸（44x44px）
const MIN_NODE_SIZE = {
  width: 200,  // 确保内容可读
  height: 44,  // 最小触摸目标
}

// 端口触摸目标
const PORT_SIZE = {
  width: 16,
  height: 16,
  hitArea: 44,  // 实际可点击区域 44x44
}

// 节点点击区域扩展
<Node
  style={{
    minWidth: MIN_NODE_SIZE.width,
    minHeight: MIN_NODE_SIZE.height,
  }}
  className="relative"
>
  {/* 实际内容 */}
  <div className="p-4">
    {/* 透明的点击区域扩展 */}
    <div className="absolute inset-0" />
  </div>
</Node>
```

#### 2.2 视觉反馈系统

```typescript
// 节点状态视觉反馈
const NodeVisualFeedback = {
  // Hover 状态
  hover: {
    borderColor: WORKFLOW_COLORS.primary[300],
    boxShadow: SHADOWS.md,
    transition: 'all 150ms ease',
  },

  // Active 状态
  active: {
    borderColor: WORKFLOW_COLORS.primary[500],
    boxShadow: SHADOWS.lg,
    transform: 'scale(0.98)',
    transition: 'all 150ms ease',
  },

  // Focus 状态
  focus: {
    borderColor: WORKFLOW_COLORS.primary[500],
    boxShadow: `0 0 0 3px ${WORKFLOW_COLORS.primary[100]}`,
    outline: 'none',
  },

  // Disabled 状态
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  }
}

// 边连接视觉反馈
const EdgeConnectionFeedback = {
  // 连接中
  connecting: {
    stroke: WORKFLOW_COLORS.info[500],
    strokeWidth: 2,
    strokeDasharray: '4,4',
    animation: 'pulse 1s infinite',
  },

  // 连接成功
  connected: {
    stroke: WORKFLOW_COLORS.success[500],
    strokeWidth: 2,
  },

  // 连接失败
  invalid: {
    stroke: WORKFLOW_COLORS.error[500],
    strokeWidth: 2,
  }
}
```

#### 2.3 错误反馈系统

```typescript
// 错误提示组件
const ErrorTooltip = ({ error, position }: { error: string, position: Position }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute z-50 px-3 py-2 bg-error-500 text-white text-sm rounded-md shadow-lg pointer-events-none"
      style={{
        left: position.x,
        top: position.y - 40,
      }}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
      {/* 箭头 */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-error-500" />
      </div>
    </div>
  )
}

// 内联错误提示
const InlineError = ({ error }: { error: string }) => (
  <div className="mt-2 p-2 bg-error-50 border border-error-200 rounded-md">
    <div className="flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-error-500 mt-0.5" />
      <div>
        <p className="text-sm text-error-700">{error}</p>
      </div>
    </div>
  </div>
)
```

### P3: Performance 优化（HIGH）

#### 3.1 虚拟滚动

```typescript
// 大工作流虚拟化
const VirtualizedCanvas = ({ nodes }: { nodes: Node[] }) => {
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const containerRef = useRef<HTMLDivElement>(null)

  // 计算可见节点
  const visibleNodes = useMemo(() => {
    const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 0, height: 0 }

    return nodes.filter(node => {
      const nodeBounds = getNodeBounds(node)
      return isIntersecting(
        nodeBounds,
        {
          x: -viewport.x / viewport.zoom,
          y: -viewport.y / viewport.zoom,
          width: width / viewport.zoom,
          height: height / viewport.zoom,
        }
      )
    })
  }, [nodes, viewport])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <ReactFlow
        nodes={visibleNodes}
        viewport={viewport}
        onMove={(event, newViewport) => setViewport(newViewport)}
      />
    </div>
  )
}
```

#### 3.2 节点优化

```typescript
// 节点 memo 优化
const OptimizedBaseNode = memo(({ id, data }: NodeProps) => {
  // 只在必要的时候重新渲染
  const { state, streamingData } = useExecutionStore(
    useCallback((store) => ({
      state: store.nodeProgress[id]?.state,
      streamingData: store.streamingData[id],
    }), [id])
  )

  return (
    <NodeContainer>
      <NodeHeader />
      {streamingData && <StreamingDataDisplay data={streamingData} />}
    </NodeContainer>
  )
})

// 避免不必要重新渲染
const areEqual = (prevProps: NodeProps, nextProps: NodeProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.state === nextProps.data.state &&
    prevProps.data.collapsed === nextProps.data.collapsed
  )
}

OptimizedBaseNode.areEqual = areEqual
```

#### 3.3 内存优化

```typescript
// 清理订阅
const useNodeSubscriptions = (nodeId: string) => {
  const store = useExecutionStore()

  useEffect(() => {
    const subscription = store.nodeProgress$.subscribe((progress) => {
      // 处理进度更新
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [nodeId])

  // 自动清理
  useEffect(() => {
    return () => {
      // 组件卸载时清理
      store.clearNodeData(nodeId)
    }
  }, [nodeId])
}
```

### P4: Layout & Responsive 优化（HIGH）

#### 4.1 响应式布局

```typescript
// 断点系统
const BREAKPOINTS = {
  sm: '640px',   // 平板竖屏
  md: '768px',   // 平板横屏
  lg: '1024px',  // 笔记本
  xl: '1280px',  // 桌面
  '2xl': '1536px', // 大屏
}

// 响应式画布
const ResponsiveWorkflowCanvas = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.md})`)
    setIsMobile(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return (
    <div className={cn(
      'workflow-canvas',
      isMobile ? 'mobile-layout' : 'desktop-layout'
    )}>
      {isMobile ? <MobileCanvas /> : <DesktopCanvas />}
    </div>
  )
}

// 移动端布局
const MobileCanvas = () => (
  <div className="flex flex-col h-screen">
    {/* 工具栏 */}
    <div className="flex-shrink-0 p-2 border-b">
      <MobileToolbar />
    </div>

    {/* 画布区域 */}
    <div className="flex-1 overflow-hidden">
      <ReactFlow
        nodesDraggable={false}  // 移动端禁用拖拽
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={false}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
      />
    </div>

    {/* 底部面板 */}
    <div className="flex-shrink-0 border-t">
      <BottomPanel />
    </div>
  </div>
)
```

#### 4.2 自适应节点尺寸

```typescript
// 自适应节点宽度
const AdaptiveNodeWidth = {
  // 根据内容动态计算宽度
  calculateWidth: (content: string) => {
    const charWidth = 8 // 估算字符宽度
    const padding = 32  // 左右内边距
    const minWidth = 200
    const maxWidth = 400

    return Math.min(Math.max(content.length * charWidth + padding, minWidth), maxWidth)
  },

  // 响应式调整
  getResponsiveWidth: (breakpoint: string) => {
    switch (breakpoint) {
      case 'sm':
        return 180
      case 'md':
        return 220
      case 'lg':
        return 260
      default:
        return 240
    }
  }
}
```

### P5: Typography & Color 优化（MEDIUM）

#### 5.1 字体层次

```typescript
// 字体层次系统
const TYPOGRAPHY_HIERARCHY = {
  // 节点标题
  nodeTitle: {
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '24px',
    color: WORKFLOW_COLORS.gray[900],
  },

  // 节点描述
  nodeDescription: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '20px',
    color: WORKFLOW_COLORS.gray[600],
  },

  // 端口标签
  portLabel: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '16px',
    color: WORKFLOW_COLORS.gray[700],
  },

  // 按钮文字
  buttonText: {
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '20px',
  },

  // 状态文字
  statusText: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }
}
```

#### 5.2 颜色对比度

```typescript
// WCAG 2.1 AA 标准（4.5:1）
const CONTRAST_RATIO = {
  // 文本对比度
  normalText: {
    ratio: 4.5,
    foreground: WORKFLOW_COLORS.gray[900],
    background: WORKFLOW_COLORS.gray[50],
  },

  // 大文本对比度
  largeText: {
    ratio: 3,
    foreground: WORKFLOW_COLORS.gray[900],
    background: WORKFLOW_COLORS.gray[50],
  },

  // 非文本元素
  nonText: {
    ratio: 3,
    foreground: WORKFLOW_COLORS.gray[400],
    background: WORKFLOW_COLORS.gray[100],
  }
}

// 检查对比度
const checkContrast = (foreground: string, background: string): boolean => {
  // 使用 chroma-js 或类似库计算对比度
  const ratio = calculateContrastRatio(foreground, background)
  return ratio >= 4.5
}
```

### P6: Animation 优化（MEDIUM）

#### 6.1 过渡动画

```typescript
// 动画配置
const ANIMATIONS = {
  // 微交互（150-300ms）
  micro: {
    duration: '150ms',
    easing: 'ease-out',
  },

  // 标准过渡（300ms）
  standard: {
    duration: '300ms',
    easing: 'ease-in-out',
  },

  // 慢速过渡（500ms）
  slow: {
    duration: '500ms',
    easing: 'ease-in-out',
  }
}

// 动画配置
const transitions = {
  // 节点悬停
  nodeHover: {
    borderColor: `transition-colors ${ANIMATIONS.micro.duration} ${ANIMATIONS.micro.easing}`,
    boxShadow: `transition-shadow ${ANIMATIONS.micro.duration} ${ANIMATIONS.micro.easing}`,
  },

  // 节点展开/折叠
  nodeCollapse: {
    height: `transition-height ${ANIMATIONS.standard.duration} ${ANIMATIONS.standard.easing}`,
    opacity: `transition-opacity ${ANIMATIONS.standard.duration} ${ANIMATIONS.standard.easing}`,
  },

  // 面板切换
  panelSlide: {
    transform: `transform ${ANIMATIONS.standard.duration} ${ANIMATIONS.standard.easing}`,
  }
}
```

#### 6.2 加载动画

```typescript
// 节点加载状态
const NodeLoadingSpinner = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
    <div className="relative">
      <Spinner className="w-6 h-6 text-primary-500" />
      <div className="absolute inset-0 border-2 border-primary-200 rounded-full animate-pulse" />
    </div>
  </div>
)

// 数据流动画
const DataFlowAnimation = () => {
  return (
    <svg className="absolute inset-0 pointer-events-none">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={WORKFLOW_COLORS.primary[500]}
          />
        </marker>
      </defs>

      {/* 数据流动画 */}
      <path
        d="M 0 50 Q 150 50 300 50"
        stroke={WORKFLOW_COLORS.primary[300]}
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
        strokeDasharray="5,5"
        className="animate-pulse"
      />
    </svg>
  )
}

// 进度条动画
const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
    <div
      className="h-full bg-primary-500 transition-all duration-300 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
)
```

#### 6.3 尊重用户偏好

```typescript
// 检测用户偏好
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// 应用用户偏好
const AnimatedNode = ({ children }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={cn(
        'transition-all duration-300',
        prefersReducedMotion && 'transition-none'
      )}
    >
      {children}
    </div>
  )
}
```

### P7: Style Selection 优化（MEDIUM）

#### 7.1 视觉风格升级

```typescript
// 专业工作流风格
const PROFESSIONAL_STYLE = {
  // 节点样式
  node: {
    border: `1px solid ${WORKFLOW_COLORS.gray[200]}`,
    borderRadius: BORDER_RADIUS.md,
    background: WORKFLOW_COLORS.gray[50],
    boxShadow: SHADOWS.sm,
  },

  // 选中节点
  selectedNode: {
    border: `2px solid ${WORKFLOW_COLORS.primary[500]}`,
    boxShadow: SHADOWS.md,
  },

  // 连接点样式
  handle: {
    width: 16,
    height: 16,
    background: WORKFLOW_COLORS.gray[50],
    border: `2px solid ${WORKFLOW_COLORS.primary[500]}`,
    borderRadius: '50%',
  },

  // 连接线样式
  edge: {
    stroke: WORKFLOW_COLORS.gray[300],
    strokeWidth: 2,
  }
}
```

#### 7.2 数据密度优化

```typescript
// 数据密度模式
const DataDensityModes = {
  // 紧凑模式
  compact: {
    nodePadding: SPACING[2],      // 8px
    nodeGap: SPACING[3],          // 12px
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: 1.4,
  },

  // 标准模式
  comfortable: {
    nodePadding: SPACING[4],     // 16px
    nodeGap: SPACING[4],          // 16px
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 1.5,
  },

  // 宽松模式
  spacious: {
    nodePadding: SPACING[6],      // 24px
    nodeGap: SPACING[6],          // 24px
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: 1.75,
  }
}

// 密度切换组件
const DensityToggle = () => {
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable')

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setDensity('compact')}
        className={cn(
          'px-3 py-1 rounded',
          density === 'compact' && 'bg-primary-500 text-white'
        )}
      >
        紧凑
      </button>
      <button
        onClick={() => setDensity('comfortable')}
        className={cn(
          'px-3 py-1 rounded',
          density === 'comfortable' && 'bg-primary-500 text-white'
        )}
      >
        标准
      </button>
      <button
        onClick={() => setDensity('spacious')}
        className={cn(
          'px-3 py-1 rounded',
          density === 'spacious' && 'bg-primary-500 text-white'
        )}
      >
        宽松
      </button>
    </div>
  )
}
```

### P8: Charts & Data 可视化（LOW）

#### 8.1 数据流可视化

```typescript
// 数据流显示组件
const DataFlowVisualization = ({ nodeId }: { nodeId: string }) => {
  const [dataStream, setDataStream] = useState<any[]>([])

  // 实时数据流
  useEffect(() => {
    const subscription = dataStream$.subscribe((data) => {
      setDataStream((prev) => [...prev.slice(-9), data]) // 保留最近10条
    })

    return () => subscription.unsubscribe()
  }, [nodeId])

  return (
    <div className="absolute top-2 right-2 w-64 bg-white border rounded-md shadow-lg p-2">
      <div className="text-xs font-semibold mb-2">数据流</div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {dataStream.map((data, index) => (
          <div
            key={index}
            className="text-xs p-1 bg-gray-50 rounded border-l-2 border-primary-300"
          >
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2).slice(0, 100)}
              {JSON.stringify(data, null, 2).length > 100 && '...'}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}

// 执行进度可视化
const ExecutionProgress = ({ nodeId }: { nodeId: string }) => {
  const progress = useExecutionStore((state) => state.nodeProgress[nodeId])

  if (!progress) return null

  return (
    <div className="absolute bottom-0 left-0 right-0">
      {/* 进度条 */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full bg-primary-500 transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* 状态指示器 */}
      <div className="flex items-center gap-1 p-1 bg-gray-800 text-white text-xs">
        <div className={cn(
          'w-2 h-2 rounded-full',
          progress.state === 'running' && 'bg-yellow-400 animate-pulse',
          progress.state === 'success' && 'bg-green-400',
          progress.state === 'error' && 'bg-red-400',
        )} />
        <span>{progress.message}</span>
      </div>
    </div>
  )
}
```

#### 8.2 调试信息面板

```typescript
// 调试面板
const DebugPanel = ({ nodeId }: { nodeId: string }) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  return (
    <div className="absolute top-2 left-2 w-80 max-h-96 bg-gray-900 text-gray-100 rounded-lg shadow-xl overflow-hidden">
      <div className="flex items-center justify-between p-2 bg-gray-800">
        <span className="text-xs font-semibold">调试信息</span>
        <button
          onClick={() => setDebugInfo(null)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto max-h-80">
        {/* 输入数据 */}
        <DebugSection title="输入" data={debugInfo?.inputs} />

        {/* 输出数据 */}
        <DebugSection title="输出" data={debugInfo?.outputs} />

        {/* 执行时间 */}
        <DebugSection
          title="执行时间"
          data={{
            start: debugInfo?.startTime,
            end: debugInfo?.endTime,
            duration: debugInfo?.duration,
          }}
        />

        {/* 错误信息 */}
        {debugInfo?.error && (
          <div className="p-2 bg-red-900/50 border border-red-700 rounded">
            <div className="text-xs font-semibold text-red-200 mb-1">错误</div>
            <pre className="text-xs text-red-100 whitespace-pre-wrap">
              {debugInfo.error.stack}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 📋 实施计划

### 阶段一：基础优化（2周）

| 任务 | 优先级 | 预计工期 | 负责人 |
|------|--------|----------|--------|
| 色彩系统实施 | P5 | 3天 | 前端团队 |
| 字体系统实施 | P5 | 2天 | 前端团队 |
| Accessibility 基础 | P1 | 5天 | 前端团队 + UX |
| 视觉反馈系统 | P2 | 4天 | 前端团队 |

**交付物**：
- 设计系统文档
- 组件库更新
- Accessibility 审计报告

### 阶段二：交互优化（3周）

| 任务 | 优先级 | 预计工期 | 负责人 |
|------|--------|----------|--------|
| 触摸目标优化 | P2 | 1周 | 前端团队 |
| 响应式布局 | P4 | 1.5周 | 前端团队 |
| 动画系统 | P6 | 5天 | 前端团队 + UX |

**交付物**：
- 移动端适配
- 动画库
- 交互测试报告

### 阶段三：高级功能（4周）

| 任务 | 优先级 | 预计工期 | 负责人 |
|------|--------|----------|--------|
| 性能优化 | P3 | 2周 | 架构团队 |
| 数据可视化 | P8 | 1.5周 | 前端团队 |
| 调试系统 | P8 | 1周 | 前端团队 |

**交付物**：
- 性能基准报告
- 调试工具
- 用户测试报告

---

## ✅ 验收标准

### Accessibility
- [ ] 通过 WCAG 2.1 AA 审计
- [ ] 键盘导航完整
- [ ] 屏幕阅读器支持
- [ ] 焦点管理规范

### Performance
- [ ] 1000+ 节点流畅渲染
- [ ] 首屏加载 < 3秒
- [ ] 交互响应 < 100ms
- [ ] 内存使用优化

### Usability
- [ ] SUS 评分 > 80
- [ ] 任务完成率 > 95%
- [ ] 错误率 < 5%
- [ ] 学习成本 < 30分钟

### Visual Design
- [ ] 设计系统一致性
- [ ] 视觉层次清晰
- [ ] 品牌一致性
- [ ] 美观度评分 > 4.0/5.0

---

## 📚 参考资源

### 设计系统
- [Material Design 3](https://m3.material.io/)
- [Carbon Design System](https://carbondesignsystem.com/)
- [Ant Design](https://ant.design/)

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [React Accessibility](https://reactjs.org/docs/accessibility.html)

### Performance
- [React Performance](https://reactjs.org/docs/optimizing-performance.html)
- [Web Vitals](https://web.dev/vitals/)

---

## 💡 总结

本优化方案基于 UI/UX Pro Max 技能的系统方法论，从 **8 类优先级规则** 出发，全面提升 workflow-ui 的用户体验：

**核心原则**：
1. **Accessibility First** - 确保所有用户都能使用
2. **Performance Critical** - 大规模应用性能保证
3. **Professional Design** - 符合专业工具标准
4. **User-Centric** - 以用户需求为中心

**预期成果**：
- 用户满意度提升 40%
- 学习成本降低 50%
- 专业用户效率提升 30%
- 无障碍合规 100%

这不仅是一次 UI 优化，更是一次 UX 革命。让 workflow-ui 成为真正**专业、高效、易用**的工作流编辑器！
