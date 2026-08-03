# @sker/eslint-config

纯 ESLint 配置包，集中维护仓库内共享的 ESLint flat config 预设（基于 `typescript-eslint`、Prettier、React 与 Next 插件）。

## 核心职责

- 提供基础预设 `base.js`：ESLint recommended + `typescript-eslint` recommended + Prettier + turbo 插件 + only-warn
- 维护一套 `relaxedRules` 规则放宽，兼容升级后新引入的激进规则与仓库既有代码风格（如 `any`、`require()`、未导出环境变量等）
- 提供 React 预设 `react-internal.js`：React recommended + react-hooks，并按需关闭 prop-types 与 react-hooks v7 激进规则
- 提供 Next.js 预设 `next.js`：在 base/React 基础上叠加 `@next/eslint-plugin-next`（recommended + core-web-vitals）
- 通过 `package.json#exports` 暴露 `./base` / `./next` / `./react-internal` 三个入口
- 只提供规则配置，不含 lint 执行入口与业务代码

## 目录结构

```
packages/eslint-config/
├── package.json               # 包元信息、exports 映射与 lint 相关 devDependencies
├── base.js                    # 基础 flat config + 导出 relaxedRules（TS/通用规则放宽）
├── react-internal.js          # React 库预设：React recommended + react-hooks
├── next.js                    # Next.js 预设：base + React + @next/eslint-plugin-next
└── README.md                  # 本文件
```

## 使用方式

```js
// packages/foo/eslint.config.mjs
import { config } from '@sker/eslint-config/base'

export default [
  ...config,
  { ignores: ['dist/**'] },
]
```

- React 库：`import { config } from '@sker/eslint-config/react-internal'`
- Next.js 应用：`import { nextJsConfig } from '@sker/eslint-config/next'`
- 派生配置如需覆盖，应把 `relaxedRules` 追加到末尾，避免被后引入的 recommended 规则覆盖（见 `next.js` 的注释说明）

## 边界

- **✅ 负责**：维护并发布共享的 ESLint flat config 预设与规则放宽（TS/React/Next/Prettier/turbo）
- **❌ 不负责**：
  - 不包含任何业务逻辑、lint 执行脚本或 `.eslintrc` 旧格式配置
  - 不负责 TypeScript 编译选项（见 `@sker/typescript-config`）
  - 不做格式美化（Prettier 配置由消费方或根目录统一管理，本包仅关闭与 Prettier 冲突的规则）
  - 不做依赖版本锁定；eslint 与插件版本由各消费方 / 根 workspace 提供
- **对外依赖**：`@eslint/js`、`typescript-eslint`、`eslint-config-prettier`、`eslint-plugin-turbo`、`eslint-plugin-only-warn`、`eslint-plugin-react`、`eslint-plugin-react-hooks`、`@next/eslint-plugin-next`、`globals`、`eslint`
- **被谁依赖**：几乎全部 workspace 包与应用，包括 `@sker/core`、`@sker/crawler-core`、`@sker/cli`、`@sker/utils`、`@sker/entities`、`@sker/workflow`、`@sker/nlp`、`@sker/redis`、`@sker/store`、`@sker/ui`、`@sker/ip-proxy` 等，以及 `apps/api`、`apps/app`、`apps/bigscreen`、`apps/cli` 等应用（共 27 处 `workspace:*` 引用）
