# @sker/storybook

Weibo-Pro 组件库的 Storybook 文档与开发环境，覆盖 `@sker/ui` 与 `@sker/workflow-ui` 等组件库（70+ 组件示例）。

## 核心职责

- 组织组件 stories：为 `@sker/ui`、`@sker/workflow-ui` 等组件库提供交互示例与文档（Button、Card、WorkflowCanvas 等）
- 组件文档：基于 `@storybook/addon-docs` 与 MDX 生成组件说明
- 样式与主题：集成 TailwindCSS 4，支持 storybook-dark-mode 暗色主题
- 工作流兼容：配置 esbuild 装饰器支持，兼容 `@sker/workflow-*` 包的编译
- 静态构建：`pnpm preview` 通过 `serve` 提供 `storybook-static/` 产物

## 目录结构

```
apps/storybook/
├── .storybook/
│   ├── main.ts           # Storybook 主配置（React-Vite 框架、Tailwind 插件、装饰器兼容）
│   └── preview.tsx       # 全局装饰器与参数
├── src/
│   ├── *.stories.tsx     # 各组件 stories（Button、Card、WorkflowCanvas、EChart 等 70+ 个）
│   ├── *.mdx             # 文档页面
│   └── styles.css        # TailwindCSS 样式
├── storybook-static/     # 构建产物
├── tsconfig.json
└── package.json
```

## 边界

- **✅ 负责**：组件文档、开发环境、交互演示、视觉回归素材
- **❌ 不负责**：不参与生产构建/运行时；不承载业务页面；不提供后端能力
- **对外依赖**：`@sker/core`、`@sker/sdk`、`@sker/ui`、`@sker/workflow`、`@sker/workflow-ast`、`@sker/workflow-browser`、`@sker/workflow-ui`；外部依赖 storybook、@storybook/react、react、tailwindcss、@xyflow/react、lexical、platejs、react-hook-form、sonner、zod、recharts
- **被谁依赖**：作为顶层应用，不被其他包依赖

## 常用命令

```bash
pnpm start        # 启动 Storybook（端口 6007）
pnpm preview      # 预览静态构建产物
pnpm check-types  # 类型检查
```
