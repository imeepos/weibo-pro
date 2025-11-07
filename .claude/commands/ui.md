# UI/UX指南 - 代码艺术家的系统化美工之道

## 核心原则

### 1. Dark 模式配置（最重要！）

**务必确认项目已配置 class 策略的 dark 模式：**

### 2. 颜色系统规则

**禁止覆盖默认颜色：**

❌ **绝对不要这样做：**
```css
@theme {
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  /* 这会破坏 Tailwind v4 的默认颜色！*/
}
```

✅ **正确做法：**
- 直接使用 Tailwind v4 默认的 gray 颜色（OKLCH 格式）
- 只定义项目特有的自定义颜色
- 必须定义 `--color-white` 和 `--color-black`

```css
@theme {
  --color-white: 255 255 255;
  --color-black: 0 0 0;

  /* 只添加自定义颜色 */
  --color-primary: 59 130 246;
  --color-brand: oklch(68% 0.1 250);
}
```

### 3. HTML 标签样式规则

**禁止硬编码主题相关样式：**

❌ **错误：**
```html
<body class="bg-dark-900 text-white">
```

✅ **正确：**
```html
<body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

## 开发样式时的工作流程

### Step 1: 确认配置

在编写任何样式代码之前，必须确认：

1. **检查 `@custom-variant dark` 是否存在**
   ```bash
   grep "@custom-variant dark" src/styles/index.css
   ```

2. **检查是否有错误的颜色覆盖**
   ```bash
   grep "color-gray-" src/styles/index.css
   ```
   如果在 `@theme` 块中找到 `--color-gray-*`，立即删除

3. **检查 HTML 标签**
   - `index.html` 中的 body 是否使用了支持主题的类

### Step 2: 编写样式

**输入框样式模板：**
```tsx
<input
  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors"
/>
```

**卡片样式模板：**
```tsx
<div className="glass-card p-4 bg-card text-card-foreground border border-border">
  {/* 内容 */}
</div>
```

**按钮样式模板：**
```tsx
<button className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors">
  按钮
</button>
```

### Step 3: 测试主题切换

在完成样式后，必须测试：
1. 切换到亮色主题，检查样式
2. 切换到暗色主题，检查样式
3. 在浏览器开发者工具中验证：
   - `.dark` class 是否正确添加到 `<html>` 上
   - `dark:` 变体是否使用 `.dark` 选择器（而不是 `@media`）

## 常见问题快速诊断

### 问题：dark: 变体不生效

**症状：** 切换主题时样式不变

**诊断步骤：**
1. 检查 `@custom-variant dark` 是否存在
2. 检查 `document.documentElement.classList` 是否包含 'dark'
3. 检查浏览器开发者工具中生成的 CSS 选择器

**解决：** 添加 `@custom-variant dark (&:where(.dark, .dark *));`

### 问题：bg-gray-200 不显示颜色

**症状：** 使用 gray 颜色类但背景透明或颜色错误

**诊断步骤：**
1. 检查 `@theme` 中是否错误定义了 `--color-gray-*`
2. 检查是否有其他样式覆盖

**解决：** 删除 `@theme` 中所有 `--color-gray-*` 定义

### 问题：样式被覆盖

**症状：** 添加了样式类但不生效

**解决：** 使用!前缀强制应用

```tsx
className="!bg-gray-100 dark:!bg-gray-800"
```

## 你的职责

当用户请求样式开发时：

1. **首先验证配置**
   - 主动检查 `@custom-variant dark` 是否存在
   - 主动检查是否有错误的颜色覆盖
   - 如果发现问题，先修复配置再继续

2. **使用正确的模板**
   - 始终使用上述样式模板
   - 确保所有主题相关样式都有 `dark:` 变体

3. **提供完整的解决方案**
   - 不只是修改组件，还要确认全局配置正确
   - 解释为什么这样做

4. **主动测试**
   - 提醒用户测试两种主题
   - 提供调试建议

## 4. 布局和滚动问题（关键！）

### 高度链条原则

**核心概念：** 元素的 `h-full` (height: 100%) 依赖父元素有明确高度，必须确保高度链条完整。

#### ❌ 常见错误：高度链条断裂

```tsx
// Layout.tsx - 错误示例
<div className="min-h-screen flex flex-col">  {/* ❌ min-h-screen 不限制最大高度 */}
  <Header />
  <main className="flex-1 h-full">           {/* ❌ 父元素没有明确高度 */}
    <div className="h-full">                 {/* ❌ 内层 div 多余 */}
      <motion.div>                           {/* ❌ motion.div 没有 h-full */}
        <PageComponent />
      </motion.div>
    </div>
  </main>
</div>
```

**问题：**
1. `min-h-screen` 只设置最小高度，内容超出会继续撑大（如 1127px）
2. motion.div 没有高度类，塌陷到 8px
3. 多余的内层 div 破坏高度链条

#### ✅ 正确做法：完整的高度链条

```tsx
// Layout.tsx - 正确示例
<div className="h-screen flex flex-col overflow-hidden">  {/* ✅ h-screen 固定高度 */}
  <Header className="flex-shrink-0" />
  <main className="flex-1 h-full overflow-hidden px-6">   {/* ✅ 直接设置 padding */}
    {children}                                             {/* ✅ 直接渲染 children */}
  </main>
</div>

// App.tsx - 路由配置
<Route
  path="/page"
  element={
    <motion.div
      className="h-full"          {/* ✅ 必须设置 h-full */}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <PageComponent />
    </motion.div>
  }
/>

// PageComponent.tsx - 页面组件
const PageComponent = () => (
  <div className="h-full dashboard-no-scroll">  {/* ✅ h-full，不用 min-h-full */}
    <div className="absolute inset-0">          {/* ✅ 绝对定位填充父元素 */}
      {/* 内容 */}
    </div>
  </div>
);
```

### 高度检查清单

当页面出现滚动条问题时，按以下步骤检查：

1. **检查根容器** (`Layout.tsx`)
   - ✅ 使用 `h-screen`（不是 `min-h-screen`）
   - ✅ 添加 `overflow-hidden`
   - ✅ 使用 `flex flex-col`

2. **检查 main 元素**
   - ✅ 使用 `flex-1 h-full`
   - ✅ 直接添加 padding，不要内层 div
   - ✅ 添加 `overflow-hidden`

3. **检查 framer-motion 包装器** (`App.tsx`)
   - ✅ 所有 `motion.div` 都要添加 `className="h-full"`
   - ✅ 检查每个路由的 element

4. **检查页面组件**
   - ✅ 根元素使用 `h-full`（不是 `min-h-full`）
   - ✅ 如果使用 `.dashboard-no-scroll`，确保它有 `h-full`

### 滚动容器的正确配置

#### 场景1：整页需要滚动

```tsx
<div className="h-full overflow-y-auto overflow-x-hidden">
  {/* 内容可以超出，垂直滚动 */}
</div>
```

#### 场景2：局部区域需要滚动（如表单区域）

```tsx
<div className="h-full grid grid-cols-12 gap-4">
  {/* 左侧：固定高度，不滚动 */}
  <div className="col-span-4 flex flex-col gap-4">
    <div className="glass-card">状态</div>
    <div className="glass-card flex-1">记录</div>
  </div>

  {/* 右侧：需要滚动 */}
  <div className="col-span-8 h-full relative">
    <div className="absolute inset-0 overflow-y-auto">  {/* ✅ 绝对定位 + 滚动 */}
      <div className="flex flex-col gap-4 p-1">
        {/* 表单卡片列表 */}
      </div>
    </div>
  </div>
</div>
```

#### CSS 配置要点

在滚动容器内的卡片需要覆盖全局样式：

```css
/* 全局：所有 glass-card 在 dashboard-no-scroll 中高度 100% */
.dashboard-no-scroll .glass-card {
  height: 100% !important;
  overflow: hidden !important;
}

/* 局部：滚动容器内的卡片需要自适应高度 */
.crawler-control-scroll-wrapper .glass-card {
  height: auto !important;
  flex: 0 0 auto !important;
  overflow: visible !important;
}
```

### 调试技巧

使用浏览器开发者工具检查：

```javascript
// 在控制台执行，检查高度链条
let el = document.querySelector('.your-element');
while (el) {
  console.log(el.tagName, {
    className: el.className,
    height: el.offsetHeight,
    computedHeight: getComputedStyle(el).height
  });
  el = el.parentElement;
}
```

**症状与诊断：**

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 页面高度超出屏幕（如 1127px） | 使用了 `min-h-screen` | 改为 `h-screen` |
| 内部元素高度为 8px | `motion.div` 没有 `h-full` | 添加 `className="h-full"` |
| `h-full` 不生效 | 父元素没有明确高度 | 检查整个高度链条 |
| 局部滚动不工作 | CSS 全局样式冲突 | 添加特定选择器覆盖 |

## 记住

- **Tailwind v4 不是 v3**：配置方式完全不同
- **CSS-first 配置**：使用 `@theme` 和 `@custom-variant`，不用 config.js
- **OKLCH 是默认格式**：不要用 HEX/RGB 覆盖默认颜色
- **class 策略需要配置**：`@custom-variant dark` 是必需的
- **高度链条必须完整**：从根元素到叶子元素，每一层都要明确高度
- **framer-motion 需要高度类**：所有 `motion.div` 都要添加 `h-full`
- **使用 h-screen 而不是 min-h-screen**：固定高度，防止内容撑大

遵循这些原则，可以避免 90% 的 Tailwind CSS v4 样式问题和布局问题。
