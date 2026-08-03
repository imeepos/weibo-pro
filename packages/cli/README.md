# @sker/cli-v2

CLI 守护进程（Daemon）：常驻后台，通过 Socket.IO 连接 API 服务器接收 Claude 命令，驱动 Claude Agent SDK 执行代码任务并回传结果。可通过 `sker` 命令启停。

## 核心职责

- 提供 `sker` CLI 命令：`start` / `stop` / `restart` / `status` / `logs`
- 守护进程管理：PID 文件、`watchdog` 监督 `worker`、心跳健康检查与崩溃自动重启（指数退避，最多 5 次）
- 通过 Socket.IO 客户端（`/worker` 命名空间）直连 API 服务器，接收 `ClaudeCommand` 并回传 `ClaudeResponse`（已取代原 RabbitMQ 直连方案）
- 封装 `@anthropic-ai/claude-agent-sdk`：`query` 执行、会话管理与中断、权限审批（`canUseTool` + 前端批准回传）、Token 用量统计
- 配置管理：合并 `~/.sker/config.json` 全局配置与 `{cwd}/.sker/config.json` 本地配置
- 日志写入 `~/.sker/logs/sker.log` 与 `sker-error.log`，进程级 `uncaughtException` / `unhandledRejection` 兜底不退出

## 目录结构

```
packages/cli/
├── src/
│   ├── main.ts                          # CLI 入口（commander）：start/stop/restart/status/logs
│   ├── daemon.ts                        # 守护进程管理：PID 文件读写、spawn watchdog（detached）
│   ├── watchdog.ts                      # watchdog 进程：拉起/监督 worker，心跳超时则 kill 并指数退避重启
│   ├── worker.ts                        # worker 进程引导：DI 容器、加载配置、启动 ClaudeBridge、写入心跳
│   ├── claude-bridge.ts                 # Socket.IO 客户端桥接器：连接 API 服务器，路由命令/批准/响应
│   ├── services/
│   │   ├── claude-sdk.service.ts        #   Claude Agent SDK 封装：执行 query、会话管理、权限审批、token 统计
│   │   └── index.ts                     #   服务导出入口
│   ├── task-executor.ts                 # 任务执行器（基于 TaskManager + claude-agent-sdk query）
│   ├── task-manager.ts                  # 任务生命周期管理：并发控制、状态/进度/消息、统计
│   ├── config.ts                        # ConfigService：加载/合并全局与本地配置
│   ├── tokens.ts                        # CLI_CONFIG 注入 token 与 CliConfig 接口
│   ├── heartbeat.ts                     # 心跳文件读写（~/.sker/heartbeat.json）
│   ├── logger.ts                        # 日志写入（~/.sker/logs/）
│   ├── types/
│   │   ├── claude-types.ts              #   ClaudeCommand / ClaudeResponse / TaskState 等类型
│   │   └── index.ts                     #   类型导出入口
│   └── __tests__/                       # vitest 测试（claude-bridge、claude-sdk.service、integration）
├── tsconfig.json                        # TypeScript 配置（继承 @sker/typescript-config/react-library）
├── vitest.config.ts                     # vitest 测试配置
└── eslint.config.mjs                    # ESLint 配置（@sker/eslint-config）
```

## 安装与使用

```bash
# 构建
pnpm build

# 启动守护进程
sker start

# 停止守护进程
sker stop

# 重启 / 查询状态 / 跟踪日志
sker restart
sker status
sker logs
```

## 配置

首次运行自动创建 `~/.sker/config.json`：

```json
{
  "id": "worker-id",
  "name": "default-worker",
  "description": "Default task worker",
  "apiServer": "http://localhost:8089"
}
```

- `apiServer`：API 服务器地址，ClaudeBridge 将连接 `${apiServer}/worker`（WebSocket）。
- 本地配置 `{cwd}/.sker/config.json` 会覆盖同名字段。

## 进程架构

```
sker start (main.ts)
  └── daemon.ts ── spawn ──▶ watchdog.ts
                              ├── savePid / 心跳检查（30s 超时）
                              └── spawn ──▶ worker.ts
                                             ├── 初始化 DI + 配置
                                             ├── ClaudeBridge（Socket.IO → API 服务器 /worker）
                                             └── ClaudeSdkService（Claude Agent SDK 执行任务）
```

## 边界

- **✅ 负责**：守护进程生命周期管理、进程监督与自动重启、与 API 服务器的 Socket.IO 通信、Claude Agent SDK 任务执行、会话/权限/token 管理、配置与日志
- **❌ 不负责**：
  - 不消费 RabbitMQ 消息队列（已由 Socket.IO 直连取代，见 `claude-bridge.ts`）
  - 不包含任何爬虫业务逻辑（属于 `@sker/crawler-core` 与 `apps/crawler`）
  - 不提供 Web/前端界面（属于 `apps/bigscreen` 等）
  - 不做任务的具体业务处理，只负责将命令投递给 Claude 并回传结果
- **对外依赖**：`@sker/core`（DI 容器）、`@sker/utils`；外部：`@anthropic-ai/claude-agent-sdk`、commander、rxjs、socket.io-client
- **被谁依赖**：无其他包声明依赖本包。本包是独立部署的守护进程，通过 `sker` bin 运行；`apps/api` 复用了与它一致的 `ClaudeCommand`/`ClaudeResponse` 类型约定（服务端侧自行定义）
