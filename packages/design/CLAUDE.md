# @sker/design

Weibo-Pro 设计系统 - 基于 React 的组件库，为整个项目提供一致的 UI 组件和设计规范。

## 目录结构

```
packages/design/
├── src/
│   ├── components/          # React 组件
│   │   ├── Button.tsx      # 按钮组件
│   │   └── index.ts        # 组件导出
│   └── index.ts            # 包入口
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

## 核心依赖

### UI 相关
- **react** ^19.1.1 - UI 框架
- **react-dom** ^19.1.1 - DOM 渲染
- **zustand** ^5.0.8 - 轻量级状态管理

### 可视化
- **echarts** ^5.0.0 - 数据可视化图表库
- **echarts-for-react** ^3.0.5 - ECharts React 封装
- **konva** ^10.0.8 - Canvas 2D 绘图库
- **react-konva** ^19.2.0 - Konva React 封装

### 布局与工具
- **react-grid-layout** ^1.5.2 - 拖拽式网格布局
- **dayjs** ^1.11.19 - 日期时间处理
- **lodash-es** ^4.17.21 - 工具函数库

## 组件列表

### Button 按钮

基础按钮组件，支持三种样式变体和三种尺寸。

**Props**:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';  // 样式变体
  size?: 'sm' | 'md' | 'lg';                     // 尺寸
}
```

**设计规范**:

**变体 (Variant)**:
- `primary` - 主要操作按钮
  - 背景：`bg-blue-600` / Hover: `bg-blue-700`
  - 文字：白色
  - 焦点环：`focus:ring-blue-500`

- `secondary` - 次要操作按钮
  - 背景：`bg-gray-200` / Hover: `bg-gray-300`
  - 文字：`text-gray-900`
  - 焦点环：`focus:ring-gray-500`

- `danger` - 危险操作按钮
  - 背景：`bg-red-600` / Hover: `bg-red-700`
  - 文字：白色
  - 焦点环：`focus:ring-red-500`

**尺寸 (Size)**:
- `sm` - 小号：`px-3 py-1.5 text-sm`
- `md` - 中号（默认）：`px-4 py-2 text-base`
- `lg` - 大号：`px-6 py-3 text-lg`

**通用样式**:
- 字重：`font-medium`
- 圆角：`rounded-md`
- 过渡：`transition-colors`
- 焦点样式：`focus:outline-none focus:ring-2 focus:ring-offset-2`

**使用示例**:
```tsx
import { Button } from '@sker/design/components/Button';

// 主要按钮
<Button variant="primary" size="md">保存</Button>

// 次要按钮
<Button variant="secondary" size="sm">取消</Button>

// 危险按钮
<Button variant="danger" size="lg" onClick={handleDelete}>
  删除
</Button>

// 自定义 className
<Button variant="primary" className="w-full">
  全宽按钮
</Button>
```

## 设计系统规范

### 颜色体系

**主色调 (Primary)**:
- 蓝色系：`blue-600` / `blue-700`（用于主要操作）

**中性色 (Neutral)**:
- 灰色系：`gray-200` / `gray-300` / `gray-900`（用于次要元素、文本）

**语义色 (Semantic)**:
- 危险/错误：`red-600` / `red-700`（用于删除、警告操作）

**焦点色 (Focus)**:
- 蓝色环：`blue-500`
- 灰色环：`gray-500`
- 红色环：`red-500`

### 间距系统

采用 Tailwind CSS 间距单位（基于 0.25rem = 4px）：

**内边距 (Padding)**:
- `px-3` = 0.75rem (12px)
- `px-4` = 1rem (16px)
- `px-6` = 1.5rem (24px)
- `py-1.5` = 0.375rem (6px)
- `py-2` = 0.5rem (8px)
- `py-3` = 0.75rem (12px)

**焦点环偏移**:
- `ring-offset-2` = 2px
- `ring-2` = 2px 环宽度

### 字体系统

**字重 (Font Weight)**:
- `font-medium` = 500（按钮默认）

**字号 (Font Size)**:
- `text-sm` = 0.875rem (14px) - 小按钮
- `text-base` = 1rem (16px) - 中按钮
- `text-lg` = 1.125rem (18px) - 大按钮

### 圆角系统

- `rounded-md` = 0.375rem (6px) - 按钮默认圆角

### 过渡动画

- `transition-colors` - 颜色过渡动画（背景、文字颜色变化时平滑过渡）

## 包导出配置

```json
{
  "exports": {
    "./*": "./src/*.tsx"
  }
}
```

支持直接路径导入：
```tsx
// 导入单个组件
import { Button } from '@sker/design/components/Button';

// 导入所有组件
import * from '@sker/design/components';
```

## 开发脚本

```bash
# 代码检查
pnpm lint

# 生成新组件（使用 Turbo Generator）
pnpm generate:component

# 类型检查
pnpm check-types
```

## 架构特点

### 1. 无构建产物设计
- 直接导出 TypeScript 源码（`.tsx`）
- 由消费方应用负责构建（Vite/Webpack）
- 减少包体积和构建复杂度

### 2. Tailwind CSS 原子化样式
- 使用 Tailwind 工具类构建组件
- 确保样式的一致性和可维护性
- 支持通过 `className` prop 扩展样式

### 3. TypeScript 类型安全
- 所有组件提供完整类型定义
- 继承原生 HTML 元素属性（如 `ButtonHTMLAttributes`）
- 支持 IDE 智能提示

### 4. 组件可组合性
- 组件接受 `children` 和自定义 `className`
- 支持扩展原生 HTML 属性
- 可与其他组件库混用

## 添加新组件指南

### 1. 使用 Generator 创建组件

```bash
pnpm generate:component
```

### 2. 手动创建组件

1. 在 `src/components/` 创建组件文件（如 `Input.tsx`）
2. 定义组件 Props 接口
3. 实现组件逻辑
4. 在 `src/components/index.ts` 中导出

**组件模板**:
```tsx
import React from 'react';

export interface YourComponentProps {
  // 定义 props
}

export const YourComponent: React.FC<YourComponentProps> = ({
  // props 解构
}) => {
  return (
    // JSX
  );
};
```

### 3. 设计规范要求

新组件必须遵循以下原则：

**存在即合理**:
- 每个 prop 必须有明确用途
- 避免冗余的配置选项
- 优先使用组合而非配置

**优雅即简约**:
- 代码自文档化，无需过多注释
- 变量命名清晰表达意图
- 保持组件单一职责

**一致性**:
- 使用统一的颜色体系（blue/gray/red）
- 使用统一的尺寸体系（sm/md/lg）
- 使用统一的间距系统（Tailwind 间距单位）
- 使用统一的动画效果（transition-colors）

## 与其他包的关系

### 消费方
目前尚未被其他包显式依赖，但设计用于：
- **@sker/web** - 前端工作流编辑器
- **@sker/bigscreen** - 大屏展示应用
- **@sker/workflow-ui** - 工作流 UI 组件

### 依赖方
- **@sker/typescript-config** - TypeScript 配置（react-library）
- **@sker/eslint-config** - ESLint 配置（react-internal）

## 未来扩展方向

### 计划中的组件
- **Input** - 输入框（文本、数字、密码等）
- **Select** - 下拉选择器
- **Modal** - 模态框
- **Tooltip** - 提示框
- **Card** - 卡片容器
- **Table** - 数据表格
- **Form** - 表单组件

### 计划中的功能
- **主题系统** - 支持亮色/暗色主题切换
- **图标库** - 统一的图标组件
- **布局组件** - Grid、Flex 布局辅助
- **可视化组件** - 基于 ECharts 的图表封装

## 最佳实践

### 1. 样式扩展
```tsx
// 推荐：使用 className 扩展样式
<Button variant="primary" className="w-full mt-4">
  全宽按钮
</Button>

// 避免：内联样式
<Button variant="primary" style={{ width: '100%' }}>
  不推荐
</Button>
```

### 2. 事件处理
```tsx
// 推荐：传递事件处理器
<Button variant="danger" onClick={handleDelete}>
  删除
</Button>

// 推荐：支持原生 HTML 属性
<Button variant="primary" disabled={isLoading}>
  保存
</Button>
```

### 3. 可访问性
```tsx
// 推荐：添加 ARIA 属性
<Button
  variant="primary"
  aria-label="保存更改"
  aria-disabled={isLoading}
>
  保存
</Button>
```

## 注意事项

1. **CSS 框架依赖** - 组件依赖 Tailwind CSS，消费方应用需要配置 Tailwind
2. **React 版本** - 使用 React 19，确保消费方兼容
3. **类型导出** - 所有 Props 接口都已导出，可用于类型推断
4. **样式覆盖** - 自定义 `className` 会追加到组件类名之后，可能需要提高 CSS 优先级

## 代码艺术家哲学

在设计组件时，秉持以下原则：

**存在即合理** - 每个组件、每个 prop、每行代码都有不可替代的理由存在。

**优雅即简约** - 代码即文档，通过精心设计的结构和命名讲述故事。

**性能即艺术** - 优化不仅为速度，更为执行的优雅。

注意：不要过度设计！保持简洁、专注、优雅。
