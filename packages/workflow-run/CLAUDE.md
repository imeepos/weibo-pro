# @sker/workflow-run

工作流后端执行器包，包含所有节点的 Visitor 实现。

## 包信息

- **包名**: `@sker/workflow-run`
- **描述**: Backend runtime execution for workflow nodes
- **关键词**: workflow, runtime, backend, execution, sker

## 目录结构

```
packages/workflow-run/
├── src/
│   ├── services/                        # 服务层
│   │   ├── weibo-api-client.base.ts     # 微博 API 客户端基类
│   │   ├── weibo-account.service.ts     # 微博账号管理服务
│   │   ├── weibo-auth.service.ts        # 微博认证服务
│   │   ├── weibo-error.handler.ts       # 微博错误处理器
│   │   ├── weibo-request-header.builder.ts  # 微博请求头构造器
│   │   ├── weibo-referer.builder.ts     # 微博 Referer 构造器
│   │   ├── PlaywrightService.ts         # Playwright 浏览器自动化服务
│   │   ├── WeiboHtmlParser.ts           # 微博 HTML 解析器
│   │   ├── IncrementalPostDetector.ts   # 增量帖子检测器
│   │   ├── delay.service.ts             # 延迟服务（退避策略）
│   │   ├── rate-limiter.service.ts      # 速率限制服务
│   │   ├── CronSchedulerService.ts      # Cron 调度服务
│   │   └── WorkflowExecutionService.ts  # 工作流执行服务
│   │
│   ├── utils/
│   │   └── abort-helper.ts              # 中止信号辅助工具
│   │
│   ├── *Visitor.ts                      # 所有节点执行器（33 个）
│   ├── llm-client.ts                    # LLM 客户端工厂
│   └── index.ts                         # 导出入口
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```
