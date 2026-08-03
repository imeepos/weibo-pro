# @sker/typescript-config

纯 TypeScript 配置包，集中维护仓库内共享的 `tsconfig.json` 预设，供各包/应用通过 `extends` 复用。

## 核心职责

- 提供一份严格模式的通用基础预设 `base.json`（strict、ES2022、NodeNext 等）
- 提供场景化预设：`nextjs.json`（Next.js 应用）、`react-library.json`（React 库/组件包）、`react-native.json`（React Native）
- 通过 `package.json#exports` 暴露 `./base.json` / `./nextjs.json` / `./react-library.json` 三个子路径
- 只发布配置，不含任何编译、构建或运行逻辑

## 目录结构

```
packages/typescript-config/
├── package.json                  # 包元信息与 exports 映射（纯配置，无依赖）
├── base.json                     # 通用基础预设：strict、declaration、NodeNext、experimentalDecorators 等
├── nextjs.json                   # Next.js 预设：extends base，jsx preserve、bundler 解析、next 插件
├── react-library.json            # React 库预设：extends base，jsx react-jsx + 装饰器
└── react-native.json             # React Native 预设：jsx react-native、bundler 解析（未在 exports 中暴露）
```

## 使用方式

```jsonc
// packages/foo/tsconfig.json
{
  "extends": "@sker/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

> 注意：`react-native.json` 文件存在但未在 `package.json#exports` 中注册，消费方需直接引用文件路径，或按需补充 exports。

## 边界

- **✅ 负责**：提供并维护共享的 tsconfig 预设（基础、Next.js、React 库、React Native），约定 strict / 模块解析 / 装饰器 / JSX 等编译选项
- **❌ 不负责**：
  - 不包含任何源代码、业务逻辑或构建脚本（`build`/`check-types` 由消费方执行）
  - 不做依赖安装或版本管理（无 dependencies / devDependencies）
  - 不负责 ESLint / 其他工具的配置（见 `@sker/eslint-config`）
- **对外依赖**：无运行时依赖；仅作为 devDependency 被各包引用，需消费方自带 `typescript`
- **被谁依赖**：几乎所有 workspace 包与应用，包括 `@sker/core`、`@sker/crawler-core`、`@sker/cli`、`@sker/utils`、`@sker/workflow`、`@sker/nlp`、`@sker/entities`、`@sker/sdk` 等，以及 `apps/api`、`apps/app`、`apps/bigscreen`、`apps/storybook`、`apps/tests`、`apps/cli` 等应用（共 32 处 `workspace:*` 引用）
