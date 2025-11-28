# Storybook for @sker/ui

Weibo-Pro UI 组件库的 Storybook 文档和示例。

## 启动

```bash
# 从项目根目录启动
pnpm storybook

# 或从 apps/storybook 目录启动
cd apps/storybook
pnpm dev
```

Storybook 将在 http://localhost:6007 启动。

## 技术栈

- **Storybook 8.6** - 组件文档和开发环境
- **Vite** - 构建工具
- **React 18** - UI 框架
- **TailwindCSS 4** - 样式系统

## 目录结构

```
apps/storybook/
├── .storybook/          # Storybook 配置
│   ├── main.ts          # 主配置（Vite + 插件）
│   └── preview.tsx      # 全局装饰器和参数
├── src/
│   ├── *.stories.tsx    # 组件 stories
│   ├── *.mdx            # 文档页面
│   └── styles.css       # TailwindCSS 样式
└── package.json
```

## 添加新的 Story

创建 `.stories.tsx` 文件：

\`\`\`typescript
import type { Meta, StoryObj } from '@storybook/react'
import { YourComponent } from '@sker/ui'

const meta = {
  title: 'Components/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof YourComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // 组件 props
  },
}
\`\`\`

## 构建

```bash
pnpm build
```

生成的静态文件将输出到 `storybook-static/` 目录。

## 已有的 Stories

- **Button** - 按钮组件的各种变体
- **Card** - 卡片组件示例
- **Badge** - 徽章组件示例
- **Introduction** - 项目介绍文档
