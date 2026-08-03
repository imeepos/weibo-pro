# @sker/tests

基于 vitest 的 API 集成测试包，通过 `@sker/sdk` 定义的 Controller 与 `@sker/core` DI 容器直接验证后端能力。

## 核心职责

- 集成测试：通过 `root.get(Controller)` 直接调用 `@sker/sdk` 定义的 Controller，验证业务契约
- RxJS 行为测试：`rxjs.test.ts` 覆盖各种 Observable 操作符与 Subject 行为
- 测试环境初始化：`setup.ts` 创建 better-auth 客户端并挂载 `@sker/sdk` 插件
- 三种运行模式：`run` / `watch` / `ui`

## 目录结构

```
apps/tests/
├── src/
│   ├── keywords.test.ts       # 关键词词云 API 集成测试
│   ├── rxjs.test.ts           # RxJS 行为测试
│   └── setup.ts               # 全局 setup（better-auth + @sker/sdk 插件）
├── vitest.config.ts
└── tsconfig.json
```

## 边界

- **✅ 负责**：跨模块集成测试、SDK/DI 契约验证、RxJS 基础行为验证
- **❌ 不负责**：不提供运行时服务；不做各包内部单元测试的常规载体（各包自带单测）；不参与生产构建
- **对外依赖**：`@sker/sdk`、`@sker/core`；外部依赖 vitest、rxjs、amqplib、zod、better-auth、reflect-metadata
- **被谁依赖**：作为顶层应用，不被其他包依赖

## 常用命令

```bash
pnpm test          # vitest run
pnpm test:watch    # 监听模式
pnpm test:ui       # UI 模式
```
