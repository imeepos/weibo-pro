# @sker/cli

基于 Claude Agent SDK 的编程助手 CLI 工具，在终端内直接向 Claude 提问并获取回答。

## 核心职责

- 通过 `@anthropic-ai/claude-agent-sdk` 发起 Agent 查询
- 读取项目级/用户级/本地配置源（settingSources: project、user、local）
- 迭代解析 Agent 流式输出，展示结果或错误信息
- 通过 `bin` 暴露 `sker-cli` 可执行命令，支持 `pnpm start` 直接运行

## 目录结构

```
apps/cli/
├── src/
│   └── index.ts          # 唯一入口：Agent SDK 查询示例
├── .env.example          # ANTHROPIC_API_KEY 环境变量示例
├── tsup.config.ts        # 构建配置（输出 dist/index.js）
├── tsconfig.json
└── package.json
```

## 边界

- **✅ 负责**：终端下的 Claude 问答、Agent 会话管理与流式结果输出
- **❌ 不负责**：不提供 Web UI；不做聊天记录持久化；不依赖 monorepo 中其他 `@sker/*` workspace 包
- **对外依赖**：`@anthropic-ai/claude-agent-sdk`、`@anthropic-ai/sdk`、`dotenv`（无 `@sker/*` workspace 依赖）
- **被谁依赖**：作为顶层应用，不被其他包依赖

## 常用命令

```bash
cp .env.example .env      # 配置 ANTHROPIC_API_KEY
pnpm dev                  # 开发（热重载）
pnpm typecheck            # 类型检查
pnpm build                # 构建
pnpm start                # 运行构建后的代码
```
