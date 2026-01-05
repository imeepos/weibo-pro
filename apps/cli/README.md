# @sker/cli

基于 Claude Agent SDK 的编程助手 CLI 工具。

## 简介

@sker/cli 是一个使用 Claude Agent SDK 构建的编程助手，可以帮助开发者解决技术问题、提供代码示例和最佳实践。

## 安装依赖

```bash
pnpm install
```

## 配置

1. 复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

2. 在 `.env` 文件中设置你的 Anthropic API Key：

```env
ANTHROPIC_API_KEY=your_api_key_here
```

获取 API Key: https://console.anthropic.com/

## 开发

```bash
# 启动开发模式（热重载）
pnpm dev

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

## 构建

```bash
# 构建项目
pnpm build

# 运行构建后的代码
pnpm start
```

## 使用

构建后，可以直接运行：

```bash
pnpm start
```

或者在开发模式下运行：

```bash
pnpm dev
```

## 技术栈

- **Claude Agent SDK**: v0.1.76 - Anthropic 官方 Agent SDK
- **TypeScript**: 5.9.2 - 类型安全
- **tsup**: 现代化的 TypeScript 打包工具
- **tsx**: TypeScript 执行器

## 项目结构

```
apps/cli/
├── src/
│   └── index.ts       # 主入口文件
├── .env.example       # 环境变量示例
├── tsconfig.json      # TypeScript 配置
├── tsup.config.ts     # 构建配置
└── package.json       # 项目配置
```

## 许可证

私有项目
