---
name: tailwindcss
description: tailwindcss 使用技巧。
---

# TailwindCSS v4 使用指南

本项目使用 TailwindCSS v4，采用 `@import` + `@theme` 新语法。

## 核心文件

- 全局样式：`packages/ui/src/styles/globals.css`

## 配置语法（v4 新特性）

```css
@import "tailwindcss";

@plugin "tailwind-scrollbar-hide";
@plugin "@tailwindcss/typography";
@source "../**/*.{tsx}";

@custom-variant dark (&:is(.dark *));
```

## 主题颜色

使用 CSS 变量 + OKLCH 色彩空间：

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... */
}
```

## 使用方式

```tsx
<div className="bg-background text-foreground" />
<div className="bg-primary text-primary-foreground">Hello</div>
<div className="text-muted-foreground">次要文本</div>
```

## 深色模式

使用 `.dark` 类名自动应用深色主题：

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... */
}
```

## 工作流节点状态颜色

```css
--node-running: oklch(0.646 0.222 250);
--node-success: oklch(0.6 0.2 145);
--node-error: oklch(0.6 0.25 25);
--node-idle: oklch(0.922 0 0);
--node-emitting: oklch(0.6 0.2 290);
```

```tsx
<div className="bg-node-running text-node-running-foreground">运行中</div>
<div className="bg-node-success text-node-success-foreground">成功</div>
```

## 图表色板

10 色渐变色板，用于数据可视化：

```tsx
<div className="text-chart-1" />  {/* 第 1 种图表颜色 */}
<div className="text-chart-2" />  {/* 第 2 种图表颜色 */}
{/* ... chart-3 ~ chart-10 */}
```

## 圆角系统

```css
--radius: 0.625rem;
--radius-sm: calc(var(--radius) - 4px);
--radius-md: calc(var(--radius) - 2px);
--radius-lg: var(--radius);
--radius-xl: calc(var(--radius) + 4px);
```

```tsx
<div className="rounded-sm" />
<div className="rounded-lg" />
```

## 常用工具类组合

```tsx
{/* 卡片容器 */}
<div className="bg-card text-card-foreground rounded-lg border p-4" />

{/* 可交互元素 */}
<button className="bg-primary text-primary-foreground hover:opacity-90" />

{/* 状态文本 */}
<span className="text-muted-foreground text-sm" />

{/* 破坏性操作 */}
<button className="bg-destructive text-white" />
```

## 响应式设计

```tsx
<div className="p-4 md:p-6 lg:p-8" />
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
```

## 参考文件

- `packages/ui/src/styles/globals.css`
- `packages/ui/CLAUDE.md`
