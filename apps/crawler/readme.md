# @sker/crawler

微博爬虫执行服务，从数据库加载启用的工作流调度，基于 node-schedule 精确调度并执行爬虫工作流，支撑定时采集任务。

## 核心职责

- 调度加载：启动时从数据库加载所有启用的 `WorkflowScheduleEntity` 调度
- 精确调度：基于 `CronSchedulerService`（node-schedule）执行定时任务，支持分布式锁，多实例安全
- 动态更新：启动数据库变更监听（`startWatching`），新增/修改调度即时生效
- 工作流执行：复用 `@sker/workflow` + `@sker/workflow-run` 的 Visitor 实现执行爬虫工作流
- 单次验证：提供 `run-test.ts` 脚本，按 `scheduleId` 执行单次调度并校验执行结果
- 优雅关闭：SIGTERM/SIGINT 信号处理，停止所有调度与监听

## 目录结构

```
apps/crawler/
├── src/
│   ├── main.ts                 # 入口：初始化 DI、加载调度、启动变更监听、优雅关闭
│   ├── run-test.ts             # 单次调度测试脚本（按 scheduleId 执行并校验）
│   ├── run-test.helpers.ts     # run-test 参数解析、日志解析、结果判断辅助
│   └── *.test.ts               # 辅助函数单测
├── tsconfig.json
└── package.json
```

## 边界

- **✅ 负责**：定时/调度驱动的爬虫工作流执行、调度状态同步、调度运行验证
- **❌ 不负责**：不暴露 HTTP API（那是 `@sker/api`）；不发布爬取任务；当前实现不消费消息队列（基于调度器而非 MQ 消费者）
- **对外依赖**：`@sker/core`、`@sker/entities`、`@sker/mq`、`@sker/workflow`、`@sker/workflow-ast`、`@sker/workflow-run`；外部依赖 node-schedule、cron-parser、rxjs、reflect-metadata、dotenv
- **被谁依赖**：作为顶层应用，不被其他包依赖

## 常用命令

```bash
pnpm dev              # 开发（--watch）
pnpm build            # 构建（tsc）
pnpm start            # 生产启动（--expose-gc）
pnpm pm2:start        # pm2 启动（名称 sker-crawler）
pnpm check-types      # 类型检查
```
