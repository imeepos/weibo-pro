# 左侧工具栏详细设计

## 🎯 设计目标

打造一个**高效、直观、可扩展**的左侧节点工具栏，支持 54 个工作流节点的快速创建和管理。

---

## 📐 整体架构

### 布局结构

```
┌─────────────────┐
│   🔍 搜索框      │  <- 搜索节点
├─────────────────┤
│ 📦 数据源       │  <- 分类标题
│ ├ SQL执行       │
│ ├ Excel上传     │
│ └ HTTP请求      │
├─────────────────┤
│ ⚙️ 数据处理     │
│ ├ 过滤         │
│ ├ 合并         │
│ └ 转换         │
├─────────────────┤
│ 🧠 LLM         │
│ ├ 文本对话      │
│ ├ 图生文        │
│ └ 角色记忆      │
├─────────────────┤
│ 🐦 微博         │
│ ├ 关键词搜索    │
│ ├ 登录         │
│ └ 点赞列表      │
├─────────────────┤
│ 📊 舆情分析     │
│ ├ 关键词专家    │
│ ├ 媒体专家      │
│ └ 论坛专家      │
├─────────────────┤
│ 🔧 基础工具     │
│ ├ 定时调度      │
│ ├ 消息队列      │
│ └ 状态存储      │
├─────────────────┤
│ [折叠按钮]      │  <- 折叠/展开
├─────────────────┤
│ [模板库]        │  <- 底部工具
│ [设置]          │
└─────────────────┘
```

### 尺寸规范

```typescript
const TOOLBAR_DIMENSIONS = {
  width: 64,           // 工具栏宽度
  itemSize: 48,       // 按钮尺寸
  iconSize: 20,       // 图标尺寸
  sectionPadding: 8,   // 分类内边距
  sectionGap: 4,       // 分类间距
  searchHeight: 40,    // 搜索框高度
  collapseButtonHeight: 32,
  bottomToolsHeight: 80,
}
```

---

## 🔍 搜索功能设计

### 实时搜索

```typescript
interface SearchState {
  query: string
  results: SearchResult[]
  isOpen: boolean
  selectedIndex: number
}

const NodeSearchBox = () => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])

  // 实时搜索
  useEffect(() => {
    if (query.length === 0) {
      setResults([])
      return
    }

    const searchResults = searchNodes(query)
    setResults(searchResults)
  }, [query])

  // 键盘导航
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          createNode(results[selectedIndex].nodeType)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="搜索节点..."
          className="w-full h-10 pl-9 pr-4 border-b border-gray-200 focus:border-primary-500 focus:outline-none bg-transparent"
        />
      </div>

      {/* 搜索结果下拉 */}
      {isOpen && results.length > 0 && (
        <SearchResultsDropdown
          results={results}
          selectedIndex={selectedIndex}
          onSelect={(result) => createNode(result.nodeType)}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
```

### 搜索结果组件

```typescript
const SearchResultsDropdown = ({ results, selectedIndex, onSelect, onClose }) => {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      {results.map((result, index) => (
        <button
          key={result.nodeType}
          onClick={() => onSelect(result)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50',
            index === selectedIndex && 'bg-primary-50 text-primary-600'
          )}
        >
          <div className="flex-shrink-0">
            <result.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{result.title}</div>
            <div className="text-xs text-gray-500 truncate">{result.description}</div>
          </div>
          <div className="text-xs text-gray-400">{result.category}</div>
        </button>
      ))}
    </div>
  )
}
```

---

## 📂 分类体系设计

### 分类结构

```typescript
interface NodeCategory {
  id: string
  title: string
  icon: React.ComponentType<any>
  color: string
  nodes: NodeDefinition[]
  isCollapsed?: boolean
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: 'data-source',
    title: '数据源',
    icon: Database,
    color: '#3b82f6',
    nodes: [
      {
        nodeType: 'SqlExecuteAst',
        title: 'SQL执行',
        icon: Database,
        description: '执行SQL查询',
        keywords: ['sql', '数据库', '查询'],
      },
      {
        nodeType: 'ExcelUploadAst',
        title: 'Excel上传',
        icon: FileSpreadsheet,
        description: '上传并解析Excel文件',
        keywords: ['excel', '文件', '上传'],
      },
      {
        nodeType: 'HttpRequestAst',
        title: 'HTTP请求',
        icon: Globe,
        description: '发送HTTP请求',
        keywords: ['http', 'api', '请求'],
      },
      {
        nodeType: 'MarkdownUploadAst',
        title: 'Markdown上传',
        icon: FileText,
        description: '上传并解析Markdown文档',
        keywords: ['markdown', '文档', '文本'],
      },
    ],
  },
  {
    id: 'data-processing',
    title: '数据处理',
    icon: Settings,
    color: '#10b981',
    nodes: [
      {
        nodeType: 'FilterAst',
        title: '过滤',
        icon: Filter,
        description: '过滤数据',
        keywords: ['filter', '过滤', '条件'],
      },
      {
        nodeType: 'MergeAst',
        title: '合并',
        icon: Combine,
        description: '合并多个数据流',
        keywords: ['merge', '合并', 'join'],
      },
      {
        nodeType: 'TransformAst',
        title: '转换',
        icon: ArrowRightLeft,
        description: '数据格式转换',
        keywords: ['transform', '转换', '格式'],
      },
      {
        nodeType: 'AggregateAst',
        title: '聚合',
        icon: BarChart3,
        description: '数据聚合统计',
        keywords: ['aggregate', '聚合', '统计'],
      },
    ],
  },
  {
    id: 'llm',
    title: 'LLM',
    icon: Brain,
    color: '#8b5cf6',
    nodes: [
      {
        nodeType: 'LlmTextAgentAst',
        title: '文本对话',
        icon: MessageSquare,
        description: '大语言模型对话',
        keywords: ['llm', '对话', 'chat'],
      },
      {
        nodeType: 'LlmImageToTextAst',
        title: '图生文',
        icon: Image,
        description: '图像转文本',
        keywords: ['image', '图像', 'ocr'],
      },
      {
        nodeType: 'LlmTextToImageAst',
        title: '文生图',
        icon: Wand2,
        description: '文本生成图像',
        keywords: ['生成', '图像', 'ai'],
      },
      {
        nodeType: 'PersonaAst',
        title: '角色记忆',
        icon: User,
        description: '角色记忆系统',
        keywords: ['persona', '角色', '记忆'],
      },
      {
        nodeType: 'LlmStructuredOutputAst',
        title: '结构化输出',
        icon: FileCode,
        description: '结构化数据输出',
        keywords: ['structured', '结构化', 'json'],
      },
    ],
  },
  {
    id: 'weibo',
    title: '微博',
    icon: Twitter,
    color: '#ef4444',
    nodes: [
      {
        nodeType: 'WeiboKeywordSearchAst',
        title: '关键词搜索',
        icon: Search,
        description: '搜索微博内容',
        keywords: ['微博', '搜索', 'keyword'],
      },
      {
        nodeType: 'WeiboLoginAst',
        title: '登录',
        icon: LogIn,
        description: '微博登录认证',
        keywords: ['登录', 'auth', '认证'],
      },
      {
        nodeType: 'WeiboAjaxStatusesCommentAst',
        title: '评论列表',
        icon: MessageCircle,
        description: '获取微博评论',
        keywords: ['评论', 'comment'],
      },
      {
        nodeType: 'WeiboAjaxStatusesLikeShowAst',
        title: '点赞列表',
        icon: Heart,
        description: '获取点赞用户',
        keywords: ['点赞', 'like'],
      },
      {
        nodeType: 'WeiboAjaxProfileInfoAst',
        title: '用户信息',
        icon: User,
        description: '获取用户信息',
        keywords: ['用户', 'user', 'profile'],
      },
    ],
  },
  {
    id: 'sentiment',
    title: '舆情分析',
    icon: TrendingUp,
    color: '#f59e0b',
    nodes: [
      {
        nodeType: 'KeywordAgentAst',
        title: '关键词专家',
        icon: Hash,
        description: '关键词分析专家',
        keywords: ['keyword', '关键词'],
      },
      {
        nodeType: 'MediaAgentAst',
        title: '媒体专家',
        icon: Radio,
        description: '媒体影响力分析',
        keywords: ['media', '媒体'],
      },
      {
        nodeType: 'ForumAgentAst',
        title: '论坛专家',
        icon: MessageSquareText,
        description: '论坛讨论分析',
        keywords: ['forum', '论坛'],
      },
      {
        nodeType: 'InsightAgentAst',
        title: '洞察专家',
        icon: Lightbulb,
        description: '深度洞察分析',
        keywords: ['insight', '洞察'],
      },
    ],
  },
  {
    id: 'basic',
    title: '基础工具',
    icon: Wrench,
    color: '#64748b',
    nodes: [
      {
        nodeType: 'ScheduledWorkflowAst',
        title: '定时调度',
        icon: Clock,
        description: '定时执行工作流',
        keywords: ['schedule', '定时', 'cron'],
      },
      {
        nodeType: 'MqPushAst',
        title: '消息推送',
        icon: Send,
        description: '推送到消息队列',
        keywords: ['mq', '消息', '队列'],
      },
      {
        nodeType: 'StoreSetAst',
        title: '状态存储',
        icon: HardDrive,
        description: '设置状态值',
        keywords: ['store', '状态', '存储'],
      },
      {
        nodeType: 'ShareAst',
        title: '分享',
        icon: Share2,
        description: '分享结果',
        keywords: ['share', '分享', '输出'],
      },
    ],
  },
]
```

---

## 🧩 节点按钮组件

### 节点按钮设计

```typescript
interface NodeButtonProps {
  node: NodeDefinition
  isDragging?: boolean
  onCreate: (nodeType: string) => void
  onDragStart: (nodeType: string) => void
}

const NodeButton = ({ node, isDragging, onCreate, onDragStart }: NodeButtonProps) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 主按钮 */}
      <button
        onClick={() => onCreate(node.nodeType)}
        onMouseDown={() => onDragStart(node.nodeType)}
        className={cn(
          'w-12 h-12 rounded-lg border-2 transition-all duration-200',
          'flex items-center justify-center',
          'hover:scale-110 active:scale-95',
          isDragging
            ? 'border-primary-400 bg-primary-50 shadow-lg'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
          'cursor-grab active:cursor-grabbing'
        )}
        title={node.title}
      >
        <node.icon className={cn(
          'w-5 h-5',
          'text-gray-600 group-hover:text-gray-900',
          'transition-colors'
        )} />
      </button>

      {/* 悬浮提示 */}
      <Tooltip
        content={node.title}
        side="right"
        className="max-w-xs"
      >
        <div className="hidden group-hover:block absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50">
          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap">
            <div className="font-medium">{node.title}</div>
            <div className="text-xs text-gray-300 mt-1">{node.description}</div>
            {/* 箭头 */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-r-8 border-r-gray-900 border-y-4 border-y-transparent" />
          </div>
        </div>
      </Tooltip>

      {/* 使用次数徽章 */}
      <UsageBadge nodeType={node.nodeType} />
    </div>
  )
}
```

### 使用次数徽章

```typescript
const UsageBadge = ({ nodeType }: { nodeType: string }) => {
  const usageCount = useNodeUsageCount(nodeType)

  if (usageCount === 0) return null

  return (
    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
      {usageCount > 99 ? '99+' : usageCount}
    </div>
  )
}
```

---

## 📋 分类折叠功能

### 分类标题组件

```typescript
interface CategoryHeaderProps {
  category: NodeCategory
  isCollapsed: boolean
  onToggle: () => void
}

const CategoryHeader = ({ category, isCollapsed, onToggle }: CategoryHeaderProps) => {
  const usageCount = useCategoryUsageCount(category.id)

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
        'hover:bg-gray-100',
        'text-left'
      )}
    >
      <div className="flex items-center gap-2">
        <category.icon className="w-4 h-4" style={{ color: category.color }} />
        <span className="text-sm font-medium text-gray-900">{category.title}</span>
        {usageCount > 0 && (
          <span className="text-xs text-gray-500">({usageCount})</span>
        )}
      </div>
      <ChevronDown className={cn(
        'w-3 h-3 text-gray-400 transition-transform',
        isCollapsed && 'transform -rotate-90'
      )} />
    </button>
  )
}
```

### 可折叠分类容器

```typescript
const CollapsibleCategory = ({ category }: { category: NodeCategory }) => {
  const [isCollapsed, setIsCollapsed] = useState(category.defaultCollapsed || false)

  return (
    <div className="mb-2">
      <CategoryHeader
        category={category}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
              {category.nodes.map((node) => (
                <NodeButton
                  key={node.nodeType}
                  node={node}
                  onCreate={createNode}
                  onDragStart={startDragNode}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

## 🖱️ 拖拽功能设计

### 拖拽状态管理

```typescript
const useDragAndDrop = () => {
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{
    nodeType: string
    position: { x: number; y: number }
  } | null>(null)

  const startDrag = (nodeType: string, e: React.MouseEvent) => {
    setDraggedNode(nodeType)
    setDragPreview({
      nodeType,
      position: { x: e.clientX, y: e.clientY },
    })
  }

  const updateDrag = (e: MouseEvent) => {
    if (dragPreview) {
      setDragPreview({
        ...dragPreview,
        position: { x: e.clientX, y: e.clientY },
      })
    }
  }

  const endDrag = () => {
    setDraggedNode(null)
    setDragPreview(null)
  }

  // 全局鼠标事件监听
  useEffect(() => {
    if (!draggedNode) return

    const handleMouseMove = (e: MouseEvent) => updateDrag(e)
    const handleMouseUp = () => endDrag()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggedNode])

  return {
    draggedNode,
    dragPreview,
    startDrag,
    endDrag,
  }
}
```

### 拖拽预览组件

```typescript
const DragPreview = ({ preview }: { preview: DragPreviewData | null }) => {
  if (!preview) return null

  const node = getNodeDefinition(preview.nodeType)

  return (
    <div
      className="fixed pointer-events-none z-50 opacity-90"
      style={{
        left: preview.position.x,
        top: preview.position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="bg-white border-2 border-primary-500 rounded-lg shadow-lg p-2">
        <div className="flex items-center gap-2">
          <node.icon className="w-5 h-5" />
          <span className="font-medium">{node.title}</span>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎨 视觉设计规范

### 分类颜色系统

```typescript
const CATEGORY_COLORS = {
  'data-source': {
    primary: '#3b82f6',  // 蓝色
    light: '#dbeafe',
    dark: '#1e40af',
  },
  'data-processing': {
    primary: '#10b981',  // 绿色
    light: '#d1fae5',
    dark: '#065f46',
  },
  'llm': {
    primary: '#8b5cf6',  // 紫色
    light: '#ede9fe',
    dark: '#5b21b6',
  },
  'weibo': {
    primary: '#ef4444',  // 红色
    light: '#fee2e2',
    dark: '#991b1b',
  },
  'sentiment': {
    primary: '#f59e0b',  // 橙色
    light: '#fef3c7',
    dark: '#92400e',
  },
  'basic': {
    primary: '#64748b',  // 灰色
    light: '#f1f5f9',
    dark: '#334155',
  },
}
```

### 按钮状态样式

```typescript
const BUTTON_STYLES = {
  default: `
    border-gray-200 bg-white
    hover:border-gray-300 hover:bg-gray-50
    active:bg-gray-100
  `,
  active: `
    border-primary-500 bg-primary-50
    text-primary-600
  `,
  dragging: `
    border-primary-400 bg-primary-100
    shadow-lg scale-105
    cursor-grabbing
  `,
  disabled: `
    border-gray-100 bg-gray-50
    text-gray-400 cursor-not-allowed
  `,
}
```

---

## 🔧 交互状态管理

### 工具栏状态 Store

```typescript
interface ToolbarState {
  categories: Record<string, boolean>
  favorites: string[]
  recentNodes: string[]
  searchQuery: string
  isCollapsed: boolean
  collapsedSections: Set<string>
}

const useToolbarStore = create<ToolbarState>((set, get) => ({
  categories: {},
  favorites: [],
  recentNodes: [],
  searchQuery: '',
  isCollapsed: false,
  collapsedSections: new Set(),

  // 切换分类折叠状态
  toggleCategory: (categoryId: string) => {
    set((state) => {
      const collapsedSections = new Set(state.collapsedSections)
      if (collapsedSections.has(categoryId)) {
        collapsedSections.delete(categoryId)
      } else {
        collapsedSections.add(categoryId)
      }
      return { collapsedSections }
    })
  },

  // 添加到收藏
  addToFavorites: (nodeType: string) => {
    set((state) => ({
      favorites: [...state.favorites, nodeType],
    }))
  },

  // 添加到最近使用
  addToRecent: (nodeType: string) => {
    set((state) => ({
      recentNodes: [nodeType, ...state.recentNodes.filter(n => n !== nodeType)].slice(0, 5),
    }))
  },

  // 搜索
  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  // 切换工具栏折叠
  toggleCollapse: () => {
    set((state) => ({ isCollapsed: !state.isCollapsed }))
  },
}))
```

---

## 📱 移动端适配

### 移动端工具栏

```typescript
const MobileToolbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 侧滑面板 */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>节点工具箱</SheetTitle>
            <SheetDescription>
              选择要添加的节点
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <NodeSearchBox />
          </div>

          <div className="mt-6 space-y-6">
            {NODE_CATEGORIES.map((category) => (
              <CollapsibleCategory key={category.id} category={category} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

---

## ⌨️ 快捷键支持

### 键盘快捷键

```typescript
const useToolbarShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: 打开搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        focusSearchBox()
      }

      // 数字键 1-6: 快速访问分类
      if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.metaKey) {
        const categoryIndex = parseInt(e.key) - 1
        const category = NODE_CATEGORIES[categoryIndex]
        if (category) {
          toggleCategory(category.id)
        }
      }

      // F: 切换收藏夹
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        toggleFavoritesView()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
```

---

## 📊 使用统计与分析

### 使用频率统计

```typescript
const useNodeAnalytics = (nodeType: string) => {
  const [stats, setStats] = useState({
    usageCount: 0,
    lastUsed: null as Date | null,
    averageExecutionTime: 0,
    successRate: 0,
  })

  useEffect(() => {
    const analytics = getNodeAnalytics(nodeType)
    setStats(analytics)
  }, [nodeType])

  return stats
}
```

### 智能推荐

```typescript
const SmartRecommendations = () => {
  const recentNodes = useRecentNodes()
  const userWorkflows = useUserWorkflows()

  const recommendations = useMemo(() => {
    // 基于用户历史推荐常用节点组合
    return generateNodeRecommendations(recentNodes, userWorkflows)
  }, [recentNodes, userWorkflows])

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">推荐节点</h3>
      <div className="space-y-2">
        {recommendations.map((rec) => (
          <RecommendationItem
            key={rec.nodeType}
            recommendation={rec}
            onSelect={createNode}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## 🔍 性能优化

### 懒加载

```typescript
const LazyCategory = ({ category }: { category: NodeCategory }) => {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CollapsibleCategory category={category} />
    </Suspense>
  )
}

const CategorySkeleton = () => (
  <div className="mb-2">
    <div className="h-8 bg-gray-200 rounded animate-pulse" />
    <div className="mt-2 space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  </div>
)
```

### 虚拟化长列表

```typescript
const VirtualizedNodeList = ({ nodes }: { nodes: NodeDefinition[] }) => {
  const itemHeight = 48

  return (
    <FixedSizeList
      height={400}
      itemCount={nodes.length}
      itemSize={itemHeight}
    >
      {({ index, style }) => (
        <div style={style}>
          <NodeButton
            node={nodes[index]}
            onCreate={createNode}
            onDragStart={startDragNode}
          />
        </div>
      )}
    </FixedSizeList>
  )
}
```

---

## ✅ 验收标准

### 功能完整性
- [ ] 搜索功能正常（实时搜索、键盘导航）
- [ ] 分类折叠功能正常
- [ ] 拖拽创建节点正常
- [ ] 悬浮提示显示正确
- [ ] 快捷键响应正常

### 交互体验
- [ ] 按钮响应及时（< 100ms）
- [ ] 动画流畅（60fps）
- [ ] 视觉反馈清晰
- [ ] 操作直观易懂

### 性能指标
- [ ] 首屏渲染 < 300ms
- [ ] 搜索响应 < 50ms
- [ ] 动画帧率 > 60fps
- [ ] 内存占用合理

### 移动端适配
- [ ] 移动端布局正常
- [ ] 触控操作流畅
- [ ] 侧滑面板功能正常

---

这套左侧工具栏设计方案提供了完整的实现细节，涵盖搜索、分类、拖拽、交互、性能等各个方面，可以直接用于开发实现！🚀
