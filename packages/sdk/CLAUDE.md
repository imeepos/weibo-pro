# @sker/sdk

优雅的 API 客户端 SDK - 数字时代的艺术品

## 概述

`@sker/sdk` 是 Weibo-Pro 平台的类型安全 API 客户端，基于装饰器元数据和依赖注入实现自动化客户端代码生成。每个 Controller 类通过装饰器定义 API 接口，SDK 在运行时自动将其转换为可调用的客户端方法。

**核心设计理念**：
- 类型即文档：通过 TypeScript 类型系统确保 API 调用的完整类型安全
- 装饰器驱动：零手写胶水代码，装饰器自动生成 HTTP 请求逻辑
- DI 容器集成：与 @sker/core 无缝集成，支持多实例配置
- RxJS Observable：原生支持 SSE（Server-Sent Events）流式响应

## 目录结构

```
packages/sdk/
├── src/
│   ├── controllers/           # API 控制器（客户端存根）
│   │   ├── charts.controller.ts           # 图表数据 API
│   │   ├── events.controller.ts           # 舆情事件 API
│   │   ├── keywords.controller.ts         # 关键词 API
│   │   ├── layout.controller.ts           # 布局配置 API
│   │   ├── llm-models.controller.ts       # LLM 模型管理
│   │   ├── llm-providers.controller.ts    # LLM 提供商管理
│   │   ├── llm-model-providers.controller.ts  # 模型-提供商关联
│   │   ├── llm-chat-logs.controller.ts    # LLM 调用日志统计
│   │   ├── overview.controller.ts         # 概览数据 API
│   │   ├── sentiment.controller.ts        # 情感分析 API
│   │   ├── system.controller.ts           # 系统状态 API
│   │   ├── upload.controller.ts           # 文件上传 API
│   │   ├── user-relation.controller.ts    # 用户关系网络
│   │   ├── users.controller.ts            # 用户数据 API
│   │   ├── workflow.controller.ts         # 工作流 API（含 SSE）
│   │   ├── persona.controller.ts          # Persona 记忆图谱
│   │   ├── prompt-roles.controller.ts     # Prompt 角色管理
│   │   └── prompt-skills.controller.ts    # Prompt 技能管理
│   ├── client.ts              # 客户端核心：装饰器元数据解析 + HTTP 请求生成
│   ├── types.ts               # TypeScript 类型定义（200+ 接口）
│   ├── tokens.ts              # DI 注入令牌（AXIOS, AXIOS_CONFIG）
│   └── index.ts               # 统一导出入口
├── package.json
└── tsup.config.ts             # 构建配置（ESM + CJS 双模块输出）
```
