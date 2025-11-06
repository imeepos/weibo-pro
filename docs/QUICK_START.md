# Hero 组件 - 快速启动指南

## 🚀 5 分钟快速体验

### 第 1 步：启动开发服务器（30 秒）

```bash
# 在项目根目录执行
cd /home/ubuntu/worktrees/demo/sker

# 启动 bigscreen 应用
pnpm --filter @sker/bigscreen dev
```

**等待看到：**
```
  ➜  Local:   http://localhost:5173/
  ✓ ready in XXX ms
```

### 第 2 步：访问 Hero 演示页面（10 秒）

**方法 1：直接访问 URL**
```
在浏览器中打开：http://localhost:5173/hero-demo
```

**方法 2：通过导航菜单**
1. 打开 `http://localhost:5173/`
2. 左侧导航栏找到「Hero 布局演示」（✨ 图标）
3. 点击进入

### 第 3 步：查看效果（2 分钟）

**你将看到 3 个 Hero 示例：**

#### 示例 1：完整功能 Hero
- ✨ 渐变标题：「社交媒体舆情监控系统」
- 🎨 Canvas 动画：流动的电路连接线
- 🖼️ 背景装饰：对称的装饰图案
- 🔘 玻璃态按钮：「开始使用」和「查看演示」

#### 示例 2：简洁版 Hero
- 📝 纯文字标题：「简洁版 Hero 区域」
- 🚫 无背景动画
- 🎯 适合内容页面

#### 示例 3：自定义样式 Hero
- 🎨 双色标题：「数据驱动决策」+「洞察引领未来」
- 📊 状态指示器：实时监控、智能分析、预警系统
- 🔘 大按钮：「免费试用」和「联系销售」

#### 底部内容区域
- 📦 3 个玻璃态卡片
- 🌊 悬停上浮效果

### 第 4 步：测试交互（2 分钟）

**测试清单：**

✅ **按钮悬停**
- 移动鼠标到按钮上
- 观察按钮上浮 2px
- 观察白色高光出现

✅ **Canvas 动画**
- 观察示例 1 的电路连接线
- 流动的虚线效果
- 光点沿路径移动

✅ **响应式设计**
- 按 F12 打开开发者工具
- 点击设备模拟器按钮
- 调整宽度观察布局变化

✅ **暗色模式**
- 点击右上角主题切换按钮
- 观察所有元素自动适配

---

## 📋 完整功能清单

### ✅ 已完成

- [x] **组件开发**
  - [x] HeroSection 主组件
  - [x] BackgroundLayers 背景层
  - [x] GradientOverlay 渐变遮罩
  - [x] AnimatedCanvas Canvas 动画
  - [x] 玻璃态按钮样式

- [x] **路由集成**
  - [x] 添加 `/hero-demo` 路由
  - [x] 配置路由动画
  - [x] 导入 HeroDemo 页面

- [x] **导航集成**
  - [x] 添加「Hero 布局演示」菜单项
  - [x] 配置 Sparkles 图标
  - [x] 激活状态高亮
  - [x] 悬停效果

- [x] **文档编写**
  - [x] 深度技术解析（HERO_LAYOUT_GUIDE.md）
  - [x] 组件使用指南（HERO_COMPONENT_USAGE.md）
  - [x] 项目总结（HERO_PROJECT_SUMMARY.md）
  - [x] 集成指南（HERO_INTEGRATION_GUIDE.md）
  - [x] 快速启动（QUICK_START.md）

- [x] **示例页面**
  - [x] 完整功能示例
  - [x] 简洁版示例
  - [x] 自定义样式示例
  - [x] 内容区域集成

---

## 🎯 使用场景

### 场景 1：产品首页

```tsx
import { HeroSection } from '@/components/Hero';

<HeroSection
  title="企业级舆情监控解决方案"
  description="7x24 小时全网监控，AI 智能分析"
  actions={
    <button className="glass-button">
      免费试用
    </button>
  }
/>
```

### 场景 2：功能介绍

```tsx
<HeroSection
  title="实时监控功能"
  description="全天候监控社交媒体平台"
  showAnimation={false}
  className="py-16"
/>
```

### 场景 3：大屏展示

```tsx
<HeroSection
  title={<h1 className="text-7xl">舆情态势总览</h1>}
  showBackground={false}
  className="dashboard-no-scroll"
/>
```

---

## 📚 文档索引

### 新手入门

1. **快速启动**（本文档）
   - 5 分钟快速体验
   - 基础功能测试

2. **组件使用指南**
   - 文件：`HERO_COMPONENT_USAGE.md`
   - 内容：API 文档、示例代码、常见问题

### 深度学习

3. **深度技术解析**
   - 文件：`HERO_LAYOUT_GUIDE.md`
   - 内容：7 大核心技术、可视化图解、性能优化

4. **项目总结**
   - 文件：`HERO_PROJECT_SUMMARY.md`
   - 内容：成果清单、技术指标、设计决策

### 开发指南

5. **集成指南**
   - 文件：`HERO_INTEGRATION_GUIDE.md`
   - 内容：路由配置、导航集成、测试清单

---

## 🎨 效果预览

### 桌面端（1920px）

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│         渐变标题（72px）                            │
│                                                     │
│         描述文字（20px）                            │
│                                                     │
│    [开始使用]  [查看演示]                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 移动端（375px）

```
┌───────────────────┐
│                   │
│   渐变标题(36px)  │
│                   │
│   描述文字(16px)  │
│                   │
│   [开始使用]      │
│   [查看演示]      │
│                   │
└───────────────────┘
```

---

## 🔧 常见问题

### Q1: 页面空白怎么办？

**A: 检查以下几点：**
1. 开发服务器是否正在运行
2. URL 是否正确（`/hero-demo`）
3. 浏览器控制台是否有错误
4. 清除缓存重新加载

### Q2: Canvas 动画不显示？

**A: 可能原因：**
1. 浏览器不支持 Canvas（检查浏览器版本）
2. `showAnimation={false}`（检查组件 props）
3. GPU 加速被禁用（检查浏览器设置）

### Q3: 菜单不高亮？

**A: 检查：**
1. 路由路径是否匹配（`/hero-demo`）
2. 刷新页面试试
3. 检查浏览器控制台错误

### Q4: 暗色模式不生效？

**A: 确认：**
1. 主题切换按钮是否点击
2. 根元素是否有 `.dark` 类
3. CSS 变量是否正确加载

---

## 🎓 下一步学习

### 初级（已完成快速启动）

✅ 你现在可以：
- 访问 Hero 演示页面
- 理解基本功能
- 测试交互效果

➡️ **建议下一步：**
阅读《组件使用指南》学习如何在自己的页面中使用 Hero 组件

### 中级（掌握组件使用）

📚 **推荐阅读：**
- `HERO_COMPONENT_USAGE.md` - 学习 API 和高级用法
- 查看 `/apps/bigscreen/src/pages/HeroDemo.tsx` - 研究示例代码

➡️ **实践项目：**
在首页添加一个自定义的 Hero 区域

### 高级（深入技术原理）

🔬 **深度学习：**
- `HERO_LAYOUT_GUIDE.md` - 学习技术原理和设计思路
- 研究 Canvas 动画实现
- 优化性能

➡️ **进阶项目：**
创建自己的动画效果或装饰图案

---

## 🤝 获取帮助

### 文档资源

- 📖 组件使用指南
- 🔍 深度技术解析
- 📊 项目总结
- 🧪 集成指南

### 示例代码

- `/apps/bigscreen/src/pages/HeroDemo.tsx`
- `/apps/bigscreen/src/components/Hero/`

### 在线资源

- [Framer Motion 文档](https://www.framer.com/motion/)
- [TailwindCSS 文档](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

## 🎉 恭喜！

你已经成功体验了 Hero 组件的所有功能！

**你学到了：**
- ✅ 如何启动项目
- ✅ 如何访问演示页面
- ✅ Hero 组件的功能特性
- ✅ 基础交互测试方法

**接下来可以：**
- 🚀 在自己的页面中使用 Hero 组件
- 📚 深入学习技术原理
- 🎨 自定义样式和动画
- 🔧 贡献代码改进

---

**最后更新：** 2025-01-07
**预计阅读时间：** 5 分钟
**难度等级：** ⭐ 入门
