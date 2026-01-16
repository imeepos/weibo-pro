# Workflow-UI 整体布局优化方案

## 📐 布局架构设计

基于 UI/UX Pro Max 技能的方法论，设计专业工作流编辑器的现代化布局架构。

---

## 🎯 整体布局结构

### 主布局框架

```typescript
<LayoutRoot>
  {/* 全局通知/Toast 区域 */}
  <NotificationContainer />

  {/* 主体布局 */}
  <MainLayout>
    {/* 顶部导航栏 */}
    <TopNavBar />

    {/* 主内容区域 */}
    <MainContentArea>
      {/* 左侧工具栏 */}
      <LeftToolbar />

      {/* 中心画布区域 */}
      <CanvasArea>
        {/* 画布容器 */}
        <CanvasContainer />

        {/* 缩略图 */}
        <Minimap />

        {/* 悬浮操作按钮 */}
        <FloatingActions />
      </CanvasArea>

      {/* 右侧属性面板 */}
      <RightSidebar />
    </MainContentArea>

    {/* 底部状态栏 */}
    <StatusBar />
  </MainLayout>

  {/* 模态弹窗 */}
  <ModalLayer />

  {/* 抽屉面板 */}
  <DrawerLayer />
</LayoutRoot>
```

### 布局特性

- **固定顶部导航**：高度 64px，品牌标识 + 导航
- **固定左侧工具栏**：宽度 64px，节点分类
- **固定右侧面板**：宽度 320px，属性编辑
- **固定底部状态栏**：高度 32px，执行状态
- **中心画布区域**：自适应剩余空间
- **悬浮元素**：缩略图、操作按钮

---

## 📱 响应式断点

```typescript
const LAYOUT_BREAKPOINTS = {
  // 移动设备
  mobile: {
    breakpoint: '0px',
    leftToolbar: 'hidden',        // 移动端隐藏
    rightSidebar: 'drawer',       // 右侧面板改为抽屉
    topNavHeight: '56px',
    statusBar: 'hidden',          // 移动端隐藏状态栏
  },

  // 平板设备
  tablet: {
    breakpoint: '768px',
    leftToolbar: '64px',
    rightSidebar: '280px',
    topNavHeight: '64px',
    statusBar: '32px',
  },

  // 桌面设备
  desktop: {
    breakpoint: '1024px',
    leftToolbar: '64px',
    rightSidebar: '320px',
    topNavHeight: '64px',
    statusBar: '32px',
  },

  // 大屏设备
  wide: {
    breakpoint: '1440px',
    leftToolbar: '80px',
    rightSidebar: '360px',
    topNavHeight: '64px',
    statusBar: '32px',
  }
}
```

---

## 🎨 详细区域设计

### 1. 顶部导航栏 (TopNavBar)

#### 布局结构
```typescript
<TopNavBar className="h-16 border-b border-gray-200 bg-white">
  {/* 左侧：Logo + 导航菜单 */}
  <div className="flex items-center gap-4">
    <Logo />
    <MainNavigation />
    <RecentWorkflowsDropdown />
  </div>

  {/* 中间：工作流标题 + 面包屑 */}
  <div className="flex-1 flex items-center justify-center gap-4">
    <Breadcrumb />
    <WorkflowTitle />
    <WorkflowStatus />
  </div>

  {/* 右侧：用户菜单 + 操作按钮 */}
  <div className="flex items-center gap-2">
    <CollaboratorsAvatars />
    <SaveStatus />
    <RunButton primary />
    <SettingsButton />
    <UserMenu />
  </div>
</TopNavBar>
```

#### 功能组件

**1. 主导航菜单**
```typescript
const MainNavigation = () => (
  <nav className="flex gap-1">
    <NavItem icon={FileText} label="工作流" active />
    <NavItem icon={History} label="历史" />
    <NavItem icon={Share} label="分享" />
    <NavItem icon={Settings} label="设置" />
  </nav>
)
```

**2. 面包屑导航**
```typescript
const Breadcrumb = () => (
  <nav className="flex items-center text-sm text-gray-600">
    <span>工作流</span>
    <ChevronRight className="w-4 h-4 mx-2" />
    <span>我的工作流</span>
    <ChevronRight className="w-4 h-4 mx-2" />
    <span className="text-gray-900 font-medium">数据分析流程</span>
  </nav>
)
```

**3. 协作头像组**
```typescript
const CollaboratorsAvatars = () => (
  <div className="flex -space-x-2">
    {[user1, user2, user3].map((user) => (
      <Avatar
        key={user.id}
        src={user.avatar}
        name={user.name}
        className="ring-2 ring-white"
      />
    ))}
    <button className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-600 hover:bg-gray-200">
      <Plus className="w-4 h-4" />
    </button>
  </div>
)
```

**4. 保存状态指示器**
```typescript
const SaveStatus = () => {
  const { isSaving, lastSaved } = useWorkflowStore()

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>保存中...</span>
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>已保存 {formatRelativeTime(lastSaved)}</span>
        </>
      )}
    </div>
  )
}
```

### 2. 左侧工具栏 (LeftToolbar)

#### 布局结构
```typescript
<LeftToolbar className="w-16 border-r border-gray-200 bg-gray-50">
  {/* 节点分类导航 */}
  <div className="flex flex-col gap-2 p-2">
    <ToolbarSection title="数据源">
      <ToolbarButton icon={Database} nodeType="SqlExecuteAst" />
      <ToolbarButton icon={FileText} nodeType="ExcelUploadAst" />
      <ToolbarButton icon={Cloud} nodeType="HttpRequestAst" />
    </ToolbarSection>

    <ToolbarSection title="数据处理">
      <ToolbarButton icon={Filter} nodeType="FilterAst" />
      <ToolbarButton icon={Merge} nodeType="MergeAst" />
      <ToolbarButton icon={Transform} nodeType="TransformAst" />
    </ToolbarSection>

    <ToolbarSection title="LLM">
      <ToolbarButton icon={MessageSquare} nodeType="LlmTextAgentAst" />
      <ToolbarButton icon={Image} nodeType="LlmImageToTextAst" />
      <ToolbarButton icon={Brain} nodeType="PersonaAst" />
    </ToolbarSection>

    <ToolbarSection title="微博">
      <ToolbarButton icon={Search} nodeType="WeiboKeywordSearchAst" />
      <ToolbarButton icon={User} nodeType="WeiboLoginAst" />
      <ToolbarButton icon={Heart} nodeType="WeiboAjaxStatusesLikeShowAst" />
    </ToolbarSection>
  </div>

  {/* 底部工具 */}
  <div className="mt-auto p-2 border-t border-gray-200">
    <ToolbarButton icon={FolderOpen} label="模板库" />
    <ToolbarButton icon={Settings} label="设置" />
  </div>
</LeftToolbar>
```

#### 工具栏按钮组件
```typescript
interface ToolbarButtonProps {
  icon: React.ComponentType<any>
  nodeType?: string
  label?: string
  onClick?: () => void
  isActive?: boolean
}

const ToolbarButton = ({ icon: Icon, nodeType, label, onClick, isActive }: ToolbarButtonProps) => {
  return (
    <button
      className={cn(
        'w-12 h-12 rounded-lg flex items-center justify-center transition-colors',
        'hover:bg-white hover:shadow-sm',
        isActive && 'bg-primary-500 text-white shadow-md'
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}
```

#### 分类折叠功能
```typescript
const CollapsibleSection = ({ title, children, defaultCollapsed = false }) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-1 text-xs font-semibold text-gray-600 uppercase tracking-wider"
      >
        <span>{title}</span>
        <ChevronDown className={cn(
          'w-3 h-3 transition-transform',
          collapsed && 'transform -rotate-90'
        )} />
      </button>

      {!collapsed && (
        <div className="mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  )
}
```

### 3. 中心画布区域 (CanvasArea)

#### 布局结构
```typescript
<CanvasArea className="flex-1 relative overflow-hidden bg-gray-100">
  {/* 画布背景网格 */}
  <GridBackground />

  {/* React Flow 画布 */}
  <ReactFlow
    nodes={nodes}
    edges={edges}
    onNodesChange={onNodesChange}
    onEdgesChange={onEdgesChange}
    onConnect={onConnect}
    className="bg-transparent"
    minZoom={0.1}
    maxZoom={2}
    defaultViewport={{ x: 0, y: 0, zoom: 1 }}
  >
    <Controls
      position="bottom-right"
      showInteractive={false}
      showZoom={true}
      showFitView={true}
    />

    <Background variant="dots" gap={20} size={1} />
  </ReactFlow>

  {/* 缩略图 */}
  <Minimap
    position="top-left"
    className="!bg-white !border !border-gray-200 !shadow-lg"
    nodeStrokeWidth={3}
    nodeColor={NODE_STATE_COLORS}
    zoomable
    pannable
  />

  {/* 悬浮操作按钮 */}
  <FloatingActions />

  {/* 调试面板 */}
  {showDebugPanel && <DebugPanel />}
</CanvasArea>
```

#### 悬浮操作按钮
```typescript
const FloatingActions = () => (
  <div className="absolute bottom-6 right-6 flex flex-col gap-3">
    {/* 主要操作 */}
    <ActionButton
      icon={Play}
      label="运行工作流"
      primary
      onClick={runWorkflow}
    />

    {/* 次要操作 */}
    <ActionButton
      icon={Save}
      label="保存"
      onClick={saveWorkflow}
    />

    <ActionButton
      icon={Download}
      label="导出"
      onClick={exportWorkflow}
    />

    <ActionButton
      icon={Upload}
      label="导入"
      onClick={importWorkflow}
    />

    {/* 展开更多 */}
    <ActionButton
      icon={MoreHorizontal}
      label="更多"
      onClick={() => setShowMoreActions(true)}
    />
  </div>
)

const ActionButton = ({ icon: Icon, label, primary, onClick, ...props }) => (
  <div className="group relative">
    <button
      className={cn(
        'w-12 h-12 rounded-full shadow-lg transition-all',
        'flex items-center justify-center',
        primary
          ? 'bg-primary-500 hover:bg-primary-600 text-white'
          : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200',
        'hover:scale-110'
      )}
      onClick={onClick}
      {...props}
    >
      <Icon className="w-5 h-5" />
    </button>

    {/* 标签提示 */}
    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
      {label}
      <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent" />
    </div>
  </div>
)
```

### 4. 右侧属性面板 (RightSidebar)

#### 布局结构
```typescript
<RightSidebar className="w-80 border-l border-gray-200 bg-white flex flex-col">
  {/* 面板标签页 */}
  <TabNavigation />

  {/* 面板内容 */}
  <div className="flex-1 overflow-y-auto">
    <TabContent />
  </div>

  {/* 面板底部操作 */}
  <div className="border-t border-gray-200 p-4">
    <ActionButtons />
  </div>
</RightSidebar>
```

#### 标签页导航
```typescript
const TabNavigation = () => {
  const [activeTab, setActiveTab] = useState('properties')

  const tabs = [
    { id: 'properties', label: '属性', icon: Settings },
    { id: 'data', label: '数据', icon: Database },
    { id: 'debug', label: '调试', icon: Bug },
    { id: 'history', label: '历史', icon: History },
  ]

  return (
    <div className="border-b border-gray-200">
      <nav className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
```

#### 属性编辑面板
```typescript
const PropertiesPanel = ({ node }) => {
  const [nodeData, setNodeData] = useState(node.data)

  return (
    <div className="p-4 space-y-4">
      {/* 节点基本信息 */}
      <Section title="基本信息">
        <FormField label="节点名称">
          <Input
            value={nodeData.name || ''}
            onChange={(value) => setNodeData({ ...nodeData, name: value })}
            placeholder="输入节点名称"
          />
        </FormField>

        <FormField label="描述">
          <Textarea
            value={nodeData.description || ''}
            onChange={(value) => setNodeData({ ...nodeData, description: value })}
            placeholder="输入节点描述"
            rows={3}
          />
        </FormField>
      </Section>

      {/* 节点参数 */}
      <Section title="参数配置">
        {node.metadata.inputs.map((input) => (
          <PropertyField
            key={input.property}
            metadata={input}
            value={nodeData[input.property]}
            onChange={(value) => setNodeData({ ...nodeData, [input.property]: value })}
          />
        ))}
      </Section>

      {/* 高级设置 */}
      <CollapsibleSection title="高级设置">
        <FormField label="错误处理">
          <Select
            value={nodeData.errorStrategy || 'fail'}
            onChange={(value) => setNodeData({ ...nodeData, errorStrategy: value })}
          >
            <option value="retry">重试</option>
            <option value="skip">跳过</option>
            <option value="fail">失败</option>
            <option value="abort">终止</option>
          </Select>
        </FormField>

        <FormField label="最大重试次数">
          <Input
            type="number"
            value={nodeData.maxRetries || 0}
            onChange={(value) => setNodeData({ ...nodeData, maxRetries: parseInt(value) })}
          />
        </FormField>
      </CollapsibleSection>
    </div>
  )
}
```

### 5. 底部状态栏 (StatusBar)

#### 布局结构
```typescript
<StatusBar className="h-8 border-t border-gray-200 bg-white px-4 flex items-center justify-between text-sm text-gray-600">
  {/* 左侧：执行状态 */}
  <div className="flex items-center gap-4">
    <ExecutionStatus />
    <NodeCount />
    <EdgeCount />
  </div>

  {/* 中间：进度信息 */}
  <div className="flex items-center gap-4">
    <ProgressInfo />
  </div>

  {/* 右侧：视图信息 */}
  <div className="flex items-center gap-4">
    <ZoomLevel />
    <ViewportPosition />
    <PerformanceMonitor />
  </div>
</StatusBar>
```

#### 执行状态组件
```typescript
const ExecutionStatus = () => {
  const { status, progress } = useExecutionStore()

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'w-2 h-2 rounded-full',
        status === 'running' && 'bg-yellow-500 animate-pulse',
        status === 'success' && 'bg-green-500',
        status === 'error' && 'bg-red-500',
        status === 'idle' && 'bg-gray-400'
      )} />
      <span className="font-medium">
        {status === 'idle' && '就绪'}
        {status === 'running' && '运行中'}
        {status === 'success' && '已完成'}
        {status === 'error' && '执行失败'}
      </span>
      {progress && (
        <span className="text-xs">
          ({progress.completed}/{progress.total})
        </span>
      )}
    </div>
  )
}
```

#### 统计信息
```typescript
const NodeCount = () => {
  const nodeCount = useWorkflowStore((state) => state.nodes.length)
  const selectedCount = useWorkflowStore((state) => state.selectedNodes.length)

  return (
    <div className="flex items-center gap-1">
      <GitBranch className="w-4 h-4" />
      <span>
        {nodeCount} 个节点
        {selectedCount > 0 && ` (已选中 ${selectedCount})`}
      </span>
    </div>
  )
}
```

---

## 🖥️ 移动端适配

### 移动端布局

```typescript
const MobileLayout = () => (
  <div className="flex flex-col h-screen">
    {/* 顶部导航 */}
    <MobileTopBar />

    {/* 主内容 */}
    <div className="flex-1 relative overflow-hidden">
      <ReactFlow
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={false}
      />

      {/* 移动端悬浮按钮 */}
      <MobileFAB />
    </div>

    {/* 底部面板 */}
    <MobileBottomPanel />
  </div>
)
```

### 移动端顶部栏
```typescript
const MobileTopBar = () => (
  <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
    <button className="p-2 -ml-2">
      <Menu className="w-6 h-6" />
    </button>

    <h1 className="text-lg font-semibold truncate">数据分析流程</h1>

    <div className="flex gap-2">
      <button className="p-2">
        <Search className="w-5 h-5" />
      </button>
      <button className="p-2">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  </div>
)
```

### 移动端悬浮按钮
```typescript
const MobileFAB = () => (
  <div className="absolute bottom-20 right-4 flex flex-col gap-3">
    <FAB icon={Play} label="运行" primary />
    <FAB icon={Settings} label="属性" />
    <FAB icon={ZoomIn} label="缩放" />
  </div>
)
```

### 移动端底部面板
```typescript
const MobileBottomPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={cn(
      'bg-white border-t border-gray-200 transition-all duration-300',
      isExpanded ? 'h-96' : 'h-16'
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-16 flex items-center justify-between px-4"
      >
        <span className="font-medium">属性面板</span>
        <ChevronUp className={cn(
          'w-5 h-5 transition-transform',
          isExpanded && 'transform rotate-180'
        )} />
      </button>

      {isExpanded && (
        <div className="h-80 overflow-y-auto p-4">
          <PropertiesPanel />
        </div>
      )}
    </div>
  )
}
```

---

## 🎭 模态弹窗设计

### 工作流导出弹窗
```typescript
const ExportWorkflowModal = ({ isOpen, onClose, workflow }) => {
  const [format, setFormat] = useState('json')
  const [includeData, setIncludeData] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导出工作流</DialogTitle>
          <DialogDescription>
            选择导出格式和选项
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>导出格式</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json">JSON 格式</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yaml" id="yaml" />
                <Label htmlFor="yaml">YAML 格式</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png">PNG 图片</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeData"
              checked={includeData}
              onCheckedChange={setIncludeData}
            />
            <Label htmlFor="includeData">包含执行数据</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => exportWorkflow(workflow, format, includeData)}>
            导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 节点模板弹窗
```typescript
const TemplateGalleryModal = ({ isOpen, onClose }) => {
  const categories = [
    { id: 'all', label: '全部' },
    { id: 'data-processing', label: '数据处理' },
    { id: 'llm', label: 'LLM' },
    { id: 'sentiment', label: '舆情分析' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>模板库</DialogTitle>
          <DialogDescription>
            选择一个模板快速创建工作流
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* 分类侧边栏 */}
          <div className="w-48 border-r border-gray-200">
            <nav className="space-y-1 p-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm"
                >
                  {category.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 模板网格 */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-4 p-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => useTemplate(template)}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 📦 抽屉面板设计

### 节点历史抽屉
```typescript
const HistoryDrawer = ({ isOpen, onClose, nodeId }) => {
  const history = useNodeHistory(nodeId)

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="w-96">
        <DrawerHeader>
          <DrawerTitle>执行历史</DrawerTitle>
          <DrawerDescription>
            查看节点的所有执行记录
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.map((record) => (
            <HistoryCard
              key={record.id}
              record={record}
              onView={() => viewExecutionDetails(record)}
            />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const HistoryCard = ({ record }) => (
  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <StatusBadge status={record.status} />
        <span className="font-medium">执行 #{record.id}</span>
      </div>
      <span className="text-sm text-gray-500">
        {formatDateTime(record.timestamp)}
      </span>
    </div>

    <div className="space-y-1 text-sm text-gray-600">
      <div>耗时: {record.duration}ms</div>
      <div>输入: {record.inputCount} 条</div>
      <div>输出: {record.outputCount} 条</div>
    </div>

    <Button variant="outline" size="sm" className="w-full mt-3">
      查看详情
    </Button>
  </div>
)
```

### 调试信息抽屉
```typescript
const DebugDrawer = ({ isOpen, onClose, nodeId }) => {
  const debugInfo = useDebugInfo(nodeId)

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="w-[600px] max-w-[90vw]">
        <DrawerHeader>
          <DrawerTitle>调试信息</DrawerTitle>
          <DrawerDescription>
            查看节点的详细执行信息
          </DrawerDescription>
        </DrawerHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col">
          <TabsList className="mx-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="inputs">输入</TabsTrigger>
            <TabsTrigger value="outputs">输出</TabsTrigger>
            <TabsTrigger value="logs">日志</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="overview">
              <DebugOverview debugInfo={debugInfo} />
            </TabsContent>
            <TabsContent value="inputs">
              <DebugDataViewer data={debugInfo.inputs} />
            </TabsContent>
            <TabsContent value="outputs">
              <DebugDataViewer data={debugInfo.outputs} />
            </TabsContent>
            <TabsContent value="logs">
              <DebugLogs logs={debugInfo.logs} />
            </TabsContent>
          </div>
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
}
```

---

## 🎨 主题系统

### 暗色模式支持
```typescript
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={cn(
        'min-h-screen transition-colors',
        theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-gray-100'
      )}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

// 使用 CSS 变量
const ThemeStyles = {
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8fafc',
    '--border-primary': '#e2e8f0',
    '--text-primary': '#0f172a',
    '--text-secondary': '#64748b',
  },
  dark: {
    '--bg-primary': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--border-primary': '#334155',
    '--text-primary': '#f1f5f9',
    '--text-secondary': '#94a3b8',
  }
}
```

---

## 📊 性能优化

### 懒加载组件
```typescript
// 懒加载属性面板
const LazyPropertiesPanel = lazy(() => import('./PropertiesPanel'))

// 懒加载调试面板
const LazyDebugPanel = lazy(() => import('./DebugPanel'))

// 使用 Suspense
<Suspense fallback={<PanelSkeleton />}>
  <LazyPropertiesPanel node={selectedNode} />
</Suspense>
```

### 虚拟化长列表
```typescript
const VirtualizedNodeList = ({ nodes }) => {
  const itemHeight = 60

  return (
    <FixedSizeList
      height={400}
      itemCount={nodes.length}
      itemSize={itemHeight}
    >
      {({ index, style }) => (
        <div style={style}>
          <NodeItem node={nodes[index]} />
        </div>
      )}
    </FixedSizeList>
  )
}
```

---

## ✅ 实施检查清单

### 布局结构
- [ ] 实现主布局框架（顶部/左侧/中心/右侧/底部）
- [ ] 响应式断点系统
- [ ] 固定/浮动元素定位

### 顶部导航栏
- [ ] Logo 和品牌标识
- [ ] 主导航菜单
- [ ] 面包屑导航
- [ ] 工作流标题和状态
- [ ] 协作头像组
- [ ] 保存状态指示器
- [ ] 用户菜单

### 左侧工具栏
- [ ] 节点分类导航
- [ ] 可折叠分类
- [ ] 拖拽创建节点
- [ ] 工具按钮提示
- [ ] 底部工具区

### 中心画布区域
- [ ] React Flow 集成
- [ ] 缩略图组件
- [ ] 悬浮操作按钮
- [ ] 网格背景
- [ ] 控制组件

### 右侧属性面板
- [ ] 标签页导航
- [ ] 属性编辑表单
- [ ] 数据查看器
- [ ] 调试信息
- [ ] 历史记录

### 底部状态栏
- [ ] 执行状态指示器
- [ ] 统计信息
- [ ] 进度信息
- [ ] 视图信息

### 移动端适配
- [ ] 移动端布局
- [ ] 底部面板
- [ ] 悬浮按钮
- [ ] 触控优化

### 模态和抽屉
- [ ] 导出/导入弹窗
- [ ] 模板库弹窗
- [ ] 历史抽屉
- [ ] 调试抽屉

### 主题系统
- [ ] 亮色/暗色模式
- [ ] CSS 变量系统
- [ ] 主题切换

### 性能优化
- [ ] 组件懒加载
- [ ] 虚拟化长列表
- [ ] memo 优化

---

## 🎯 设计亮点

### 1. 空间利用最大化
- 固定导航 + 自适应内容区域
- 悬浮元素不占用主空间
- 响应式布局适配所有设备

### 2. 信息层次清晰
- 视觉分层明确
- 重要信息突出显示
- 次要信息可折叠

### 3. 交互效率高
- 悬浮按钮快速访问常用操作
- 快捷键支持
- 拖拽创建节点

### 4. 专业性强
- 符合现代工作流工具设计规范
- 丰富的调试和监控信息
- 完整的协作功能

### 5. 可扩展性好
- 模块化组件设计
- 插槽和钩子支持
- 易于添加新功能

---

## 📚 参考资源

- [React Flow Layout Examples](https://reactflow.dev/examples)
- [Tailwind CSS Layout](https://tailwindcss.com/docs/layout)
- [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/docs/components/dialog)
- [Framer Motion Layout](https://www.framer.com/motion/layout/)

---

通过这套布局优化方案，workflow-ui 将成为真正现代化、专业化、高效的工作流编辑器！🚀
