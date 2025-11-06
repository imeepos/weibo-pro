# HeroSection 组件使用指南

## 📖 概述

`HeroSection` 是一个高度可定制的 Hero 区域组件，集成了背景装饰、渐变遮罩、Canvas 动画等现代设计元素。基于项目现有的技术栈（React + TailwindCSS + Framer Motion）构建，完美融入大屏系统的设计语言。

## ✨ 特性

- 🎨 **玻璃态设计**：与项目现有的 `glass-card` 样式体系一致
- 🌈 **渐变遮罩**：使用 CSS 变量自动适配主题色
- ⚡ **Canvas 动画**：流动的电路连接线，科技感十足
- 🎭 **Framer Motion**：优雅的入场动画
- 🌓 **暗色模式**：自动适配项目主题系统
- 📱 **响应式**：完美支持移动端到桌面端
- 🎯 **高度可定制**：所有视觉元素均可配置

## 📦 安装

组件已集成到项目中，无需额外安装依赖。

```typescript
import { HeroSection } from '@/components/Hero';
```

## 🚀 快速开始

### 基础用法

```tsx
import { HeroSection } from '@/components/Hero';

function App() {
  return (
    <HeroSection
      title="欢迎使用舆情监控系统"
      description="实时监控，智能分析，及时预警"
      actions={
        <button className="glass-button">
          开始使用
        </button>
      }
    />
  );
}
```

### 完整示例

```tsx
import { HeroSection } from '@/components/Hero';
import { ArrowRight, Sparkles } from 'lucide-react';

function HomePage() {
  return (
    <HeroSection
      title={
        <span className="bg-gradient-to-r from-primary via-sentiment-positive-primary to-sentiment-neutral-primary bg-clip-text text-transparent">
          社交媒体舆情监控系统
        </span>
      }
      description="实时监控社交媒体动态，智能分析舆情趋势，为您的品牌保驾护航"
      actions={
        <>
          <button className="glass-button">
            开始使用
            <ArrowRight className="w-4 h-4" />
          </button>
          <button className="glass-button glass-button-secondary">
            <Sparkles className="w-4 h-4" />
            查看演示
          </button>
        </>
      }
      showAnimation
      showBackground
    />
  );
}
```

## 📐 API 文档

### HeroSectionProps

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string \| ReactNode` | **必填** | 主标题，支持字符串或自定义 React 元素 |
| `description` | `string \| ReactNode` | - | 描述文本，支持字符串或自定义 React 元素 |
| `actions` | `ReactNode` | - | 行动按钮区域，通常放置 CTA 按钮 |
| `showAnimation` | `boolean` | `true` | 是否显示 Canvas 动画 |
| `showBackground` | `boolean` | `true` | 是否显示背景装饰层 |
| `className` | `string` | `''` | 容器自定义类名 |
| `contentClassName` | `string` | `''` | 内容区域自定义类名 |

### 子组件

#### BackgroundLayers

背景装饰层组件，提供左右对称的装饰图片。

```tsx
import { BackgroundLayers } from '@/components/Hero';

<BackgroundLayers
  imageUrl="/assets/circuit-pattern.svg"
  className="opacity-30"
/>
```

**Props:**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `imageUrl` | `string` | `/assets/circuit-pattern.svg` | 装饰图片 URL |
| `className` | `string` | `''` | 自定义类名 |

#### GradientOverlay

渐变遮罩组件，创建径向渐变效果。

```tsx
import { GradientOverlay } from '@/components/Hero';

<GradientOverlay className="opacity-60" />
```

**Props:**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `className` | `string` | `''` | 自定义类名 |

#### AnimatedCanvas

Canvas 动画组件，绘制流动的电路连接线。

```tsx
import { AnimatedCanvas } from '@/components/Hero';

<AnimatedCanvas pathCount={5} />
```

**Props:**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `pathCount` | `number` | `5` | 电路路径数量 |
| `className` | `string` | `''` | 自定义类名 |

## 🎨 样式定制

### 使用 CSS 变量

组件使用项目现有的 CSS 变量系统，自动适配主题：

```css
/* 自定义主题色 */
:root {
  --color-primary: 59 130 246;              /* 主色调 */
  --sentiment-positive-primary: 22 163 74;  /* 正面舆情色 */
  --sentiment-neutral-primary: 37 99 235;   /* 中性舆情色 */
  --sentiment-negative-primary: 220 38 38;  /* 负面舆情色 */
}
```

### 玻璃态按钮

项目已内置 `.glass-button` 样式类：

```tsx
{/* 主按钮 */}
<button className="glass-button">
  主要操作
</button>

{/* 次要按钮 */}
<button className="glass-button glass-button-secondary">
  次要操作
</button>

{/* 自定义尺寸 */}
<button className="glass-button text-base px-6 py-3">
  大按钮
</button>
```

**按钮效果特性：**
- 多层伪元素创造深度
- 悬停时上浮 2px
- 白色渐变高光叠加
- 自动适配暗色模式

### 自定义样式

```tsx
<HeroSection
  title="自定义标题"
  className="py-40 bg-gradient-to-b from-background to-muted"
  contentClassName="max-w-5xl"
  description={
    <p className="text-2xl font-light text-foreground/70 leading-relaxed">
      自定义描述文本样式
    </p>
  }
/>
```

## 🌈 高级用法

### 渐变文字标题

```tsx
<HeroSection
  title={
    <h1 className="text-6xl font-bold">
      <span className="bg-gradient-to-r from-primary via-sentiment-positive-primary to-sentiment-neutral-primary bg-clip-text text-transparent">
        渐变标题
      </span>
    </h1>
  }
/>
```

### 多段描述

```tsx
<HeroSection
  description={
    <div className="space-y-4">
      <p className="text-xl text-foreground/80">
        第一段描述文字
      </p>
      <p className="text-lg text-muted-foreground">
        第二段辅助说明
      </p>
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sentiment-positive-primary" />
          <span>实时监控</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sentiment-neutral-primary" />
          <span>智能分析</span>
        </div>
      </div>
    </div>
  }
/>
```

### 自定义按钮组

```tsx
<HeroSection
  actions={
    <div className="flex flex-col sm:flex-row gap-4">
      <button className="glass-button group">
        开始使用
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>
      <button className="glass-button glass-button-secondary">
        查看文档
      </button>
      <a
        href="/demo"
        className="glass-button glass-button-secondary"
      >
        在线演示
      </a>
    </div>
  }
/>
```

### 禁用动画（性能优化）

```tsx
{/* 适用于低性能设备或不需要动画的场景 */}
<HeroSection
  title="简洁版 Hero"
  description="适合内容页面"
  showAnimation={false}
  showBackground={false}
  className="py-16"
/>
```

## 🎬 动画配置

### Framer Motion 变体

组件内置的动画配置：

```typescript
// 标题动画
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: [0.4, 0.36, 0, 1] }}

// 描述动画（延迟 0.1s）
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, delay: 0.1, ease: [0.4, 0.36, 0, 1] }}

// 按钮动画（延迟 0.2s）
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0.36, 0, 1] }}
```

### 自定义动画

如果需要完全自定义动画，可以传入自定义的 React 元素：

```tsx
import { motion } from 'framer-motion';

<HeroSection
  title={
    <motion.h1
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, type: 'spring' }}
      className="text-6xl font-bold"
    >
      自定义动画标题
    </motion.h1>
  }
/>
```

## 🌓 暗色模式

组件自动适配项目的暗色模式系统，使用 `.dark` 类选择器：

```tsx
{/* 自动适配 */}
<HeroSection
  title="自动适配主题"
  description="无需额外配置，自动跟随系统主题"
/>
```

**暗色模式变化：**
- 背景色自动调整
- 渐变遮罩颜色调整
- 按钮样式自动适配
- Canvas 动画颜色自动调整

## 📱 响应式设计

组件内置响应式断点：

| 断点 | 最小宽度 | 标题字体 | 内边距 |
|------|---------|---------|--------|
| 默认 | 0px | 2.25rem (36px) | 5rem (80px) |
| sm | 640px | 3rem (48px) | 8rem (128px) |
| md | 768px | 3.75rem (60px) | 8rem (128px) |
| lg | 1024px | 4.5rem (72px) | 8rem (128px) |

### 自定义响应式

```tsx
<HeroSection
  title={
    <h1 className="
      text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl
      font-bold
    ">
      超大响应式标题
    </h1>
  }
  className="py-12 sm:py-20 md:py-32 lg:py-40"
/>
```

## 🎯 实际应用场景

### 场景 1：产品首页

```tsx
<HeroSection
  title="企业级舆情监控解决方案"
  description="7x24 小时全网监控，AI 智能分析，为您的品牌保驾护航"
  actions={
    <>
      <button className="glass-button" onClick={handleTryNow}>
        免费试用
      </button>
      <button
        className="glass-button glass-button-secondary"
        onClick={handleContactSales}
      >
        联系销售
      </button>
    </>
  }
  showAnimation
  showBackground
/>
```

### 场景 2：功能介绍页

```tsx
<HeroSection
  title="实时监控功能"
  description="全天候监控社交媒体平台，第一时间捕捉关键信息"
  showAnimation={false}
  showBackground
  className="py-24"
  actions={
    <button className="glass-button">
      查看详情
    </button>
  }
/>
```

### 场景 3：大屏展示

```tsx
<HeroSection
  title={
    <h1 className="text-7xl font-bold tracking-tight">
      舆情态势总览
    </h1>
  }
  description={
    <div className="flex items-center justify-center gap-12 text-lg mt-6">
      <div className="text-center">
        <div className="text-4xl font-bold text-sentiment-positive-primary">
          1,234
        </div>
        <div className="text-muted-foreground mt-2">正面舆情</div>
      </div>
      <div className="text-center">
        <div className="text-4xl font-bold text-sentiment-neutral-primary">
          567
        </div>
        <div className="text-muted-foreground mt-2">中性舆情</div>
      </div>
      <div className="text-center">
        <div className="text-4xl font-bold text-sentiment-negative-primary">
          89
        </div>
        <div className="text-muted-foreground mt-2">负面舆情</div>
      </div>
    </div>
  }
  showAnimation
  showBackground={false}
  className="py-20 dashboard-no-scroll"
/>
```

### 场景 4：登录/注册页

```tsx
<HeroSection
  title="欢迎回来"
  description="登录您的舆情监控账户"
  showAnimation={false}
  showBackground
  className="py-16"
  actions={
    <div className="w-full max-w-md glass-card p-8">
      <form className="space-y-4">
        <input
          type="email"
          placeholder="邮箱地址"
          className="w-full px-4 py-3 rounded-lg border border-border bg-card"
        />
        <input
          type="password"
          placeholder="密码"
          className="w-full px-4 py-3 rounded-lg border border-border bg-card"
        />
        <button className="glass-button w-full py-3">
          登录
        </button>
      </form>
    </div>
  }
/>
```

## ⚡ 性能优化

### 1. 懒加载

```tsx
import { lazy, Suspense } from 'react';

const HeroSection = lazy(() => import('@/components/Hero').then(m => ({ default: m.HeroSection })));

function App() {
  return (
    <Suspense fallback={<div className="h-screen bg-background" />}>
      <HeroSection title="延迟加载" />
    </Suspense>
  );
}
```

### 2. 禁用不需要的功能

```tsx
{/* 移动端禁用动画 */}
<HeroSection
  title="移动优化"
  showAnimation={window.innerWidth > 768}
  showBackground
/>
```

### 3. 使用 memo

所有子组件已使用 `React.memo` 优化：

```typescript
export const BackgroundLayers = memo<BackgroundLayersProps>(({ ... }) => { ... });
export const GradientOverlay = memo<GradientOverlayProps>(({ ... }) => { ... });
export const AnimatedCanvas = memo<AnimatedCanvasProps>(({ ... }) => { ... });
```

## 🐛 常见问题

### Q: Canvas 动画不显示？

**A:** 检查浏览器是否支持 Canvas API，并确保 `showAnimation={true}`：

```tsx
<HeroSection
  title="测试"
  showAnimation={true}  // 确保启用
/>
```

### Q: 背景装饰图片不显示？

**A:** 确保图片路径正确，或者使用自定义图片：

```tsx
import { HeroSection, BackgroundLayers } from '@/components/Hero';

<HeroSection
  title="自定义背景"
  showBackground={false}  // 禁用默认背景
>
  <BackgroundLayers imageUrl="/your-custom-image.svg" />
</HeroSection>
```

### Q: 暗色模式颜色不对？

**A:** 检查项目根元素是否正确应用 `.dark` 类：

```tsx
// 使用项目现有的主题切换 Hook
import { useTheme } from '@/hooks/useTheme';

function App() {
  const { theme } = useTheme();

  return (
    <div className={theme}>
      <HeroSection title="测试暗色模式" />
    </div>
  );
}
```

### Q: 如何集成到现有路由？

**A:** 直接在页面组件中使用：

```tsx
// apps/bigscreen/src/pages/Home.tsx
import { HeroSection } from '@/components/Hero';

export default function Home() {
  return (
    <>
      <HeroSection
        title="首页 Hero"
        description="这是首页"
      />
      {/* 其他内容 */}
    </>
  );
}
```

## 📚 更多资源

- [深度布局指南](/docs/HERO_LAYOUT_GUIDE.md) - 详细的技术解析和设计原理
- [玻璃态设计系统](/apps/bigscreen/src/styles/index.css) - 项目样式规范
- [Framer Motion 文档](https://www.framer.com/motion/) - 动画库官方文档
- [TailwindCSS 文档](https://tailwindcss.com/) - CSS 框架官方文档

## 🤝 贡献

欢迎提交问题和改进建议！

---

**最后更新：** 2025-01-07
**维护者：** 代码艺术家团队
