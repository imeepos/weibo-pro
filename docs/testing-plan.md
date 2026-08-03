# 分层测试计划

> 依据包依赖关系，自底向上分四层测试，每层通过后再进入上一层，确保每一层功能按预期运行。

## 一、依赖分层总览

基于各包 `package.json` 的 workspace 依赖提取，分四层（自底向上）：

```
L3 应用层    api / crawler / app / bigscreen / cli / cli-v2 / worker / email-d1 / storybook / tests
            │  依赖 L0-L2 几乎所有包
L2 业务引擎  agent / nlp / workflow* / crawler-core / ui / aui / pageindex / email
            │  依赖 L0/L1
L1 数据/服务  entities / redis / mq / sdk / auth / ip-proxy / llm-protocol
            │  依赖 L0
L0 基础库    core / utils / json-harmony / store / compiler / typescript-config / eslint-config
            │  无业务依赖（仅互依赖或配置）
```

**依赖方向**：L0 ← L1 ← L2 ← L3。测试必须**自底向上**：下层未验证前，上层测试不可信。

## 二、测试策略总览

| 层 | 测试类型 | 依赖策略 | 目标 |
|----|---------|---------|------|
| L0 基础库 | **单元测试** | 全部 mock 外部依赖 | 验证纯逻辑正确性 |
| L1 数据/服务 | **单元 + 集成** | mock 外部资源（DB/Redis/队列/LLM），用真实 L0 | 验证数据访问与服务封装 |
| L2 业务引擎 | **单元 + 集成** | 用真实 L0/L1，mock 外部资源 | 验证业务逻辑与跨包编排 |
| L3 应用层 | **集成 + E2E** | 真实服务 + 容器化外部依赖 | 验证 API 契约与完整业务流 |

**分层门禁（gate）**：每层测试 100% 通过（含类型检查、lint）后，才进入上一层。任一层的失败应视为该层或下层的缺陷。

## 三、L0 基础库 — 单元测试

**特点**：无业务依赖、纯逻辑、快（ms 级）、无需外部资源。

| 包 | 测试重点 | mock 策略 |
|----|---------|-----------|
| `core` | DI 容器：注入/多值/作用域/循环依赖检测/生命周期 | 无（纯逻辑） |
| `utils` | 加密编码：hash/HMAC/RSA/ECDSA/OTP/base32/base64/hex | 无 |
| `json-harmony` | 容错解析：损坏 JSON/YAML 混合/恢复策略 | 无 |
| `store` | 状态管理：reducer/selector/effect/订阅 | 无 |
| `compiler` | AST 转换、厂商协议互转、工具调用编译/执行 | mock `@sker/core` DI |
| `mq` | 连接池/重连/批量发布/消费 ack | **mock amqplib** |
| `typescript-config`/`eslint-config` | 配置有效性（json 校验/导出存在） | 无 |

**完成标准**：每包覆盖率 ≥ 70%（语句），关键分支（循环依赖、重连、容错恢复）全覆盖。

**现状**：core 4、store 10、compiler 4、json-harmony 1、mq 0（**缺口**）、utils 0（**缺口**）。

## 四、L1 数据/服务层 — 单元 + 集成

**特点**：封装数据访问与外部服务，需 mock 外部资源，验证与 L0 的协作。

| 包 | 测试重点 | 集成点 |
|----|---------|--------|
| `entities` | TypeORM 实体定义、查询构建、迁移脚本 | 用真实 `core` DI |
| `redis` | 客户端包装：序列化/Pipeline/命令 | 用真实 `core`；**mock ioredis** |
| `mq` | 队列发布/消费/死信 | 用真实 `core`；**mock amqplib** |
| `sdk` | 类型契约、请求构建 | 用真实 `core`/`entities`/`workflow` |
| `auth` | 插件编译、RBAC、OpenAPI | 用真实 `core`；mock `better-auth` |
| `ip-proxy` | 代理池分配/验证/轮询 | 用真实 `core`/`redis`；mock 网络 |
| `llm-protocol` | OpenAI/Claude/Codex 协议互转 | 用真实 `core`；纯逻辑 |
| `nlp` | LLM 舆情分析：情感/关键词/事件提取 | mock `openai`；用真实 `ip-proxy`/`json-harmony` |

**集成测试（跨包）**：
- `core` + `redis`/`mq`：DI 注入真实客户端（mock 连接层）
- `entities` 实体 → `redis` 缓存联动
- `sdk` 类型 ↔ `entities` 实体：字段契约一致性

**完成标准**：每个数据服务的方法/命令路径有测试；集成点（DI 注入）至少 1 个跨包测试。

**现状**：entities 7、ip-proxy 8、redis 0（**缺口**）、mq 0（**缺口**）、sdk 0（**缺口**）、nlp 0（**缺口**）。

## 五、L2 业务引擎层 — 单元 + 集成

**特点**：承载核心业务逻辑与跨包编排，是系统的心脏。

### 5.1 workflow 家族（重点）
| 包 | 测试重点 |
|----|---------|
| `workflow` | 引擎：AST 遍历、visitor 分发、RxJS 流 |
| `workflow-ast` | 节点定义、装饰器元数据 |
| `workflow-compiler` | DSL：词法→语法→语义→代码生成 |
| `workflow-run` | 72 个节点 Visitor 的执行逻辑（微博/LLM/调度/舆情） |
| `workflow-browser` | 浏览器端执行器（远程+本地混合） |
| `workflow-ui` | 可视化编辑器组件（React Flow） |

**集成测试（workflow 链路）**：
1. `workflow-compiler` DSL → `workflow` 引擎 → `workflow-ast` 节点 → `workflow-run` 执行，**验证完整链路**
2. 微博登录/搜索/舆情节点：AST 定义 ↔ Visitor 执行一致

### 5.2 其他业务引擎
| 包 | 测试重点 | mock |
|----|---------|------|
| `agent` | 研究 Agent、千门八将多智能体编排 | mock LLM/langchain |
| `crawler-core` | HTTP 客户端、浏览器管理、多平台爬虫 | mock 网络/playwright |
| `ui`/`aui` | 组件渲染、交互、状态 | jsdom |
| `pageindex` | PDF/Markdown 文档索引 | mock pdfjs |
| `email` | 临时邮箱建号/收信/验证码提取 | mock 外部邮箱 API |

**完成标准**：workflow 链路集成测试通过；每个业务引擎核心路径有测试；L2 层不直接访问外部资源（通过 L1 mock）。

**现状**：workflow-run 28、workflow-ui 19、workflow-compiler 6、workflow-ast 2、workflow 1、agent 0（**缺口**）、crawler-core 1、ui 8。

## 六、L3 应用层 — 集成 + E2E

**特点**：验证对外接口与完整业务流程。分层：
- **集成测试**：controller/service 逻辑（mock 下层或 L2 的真实对象）
- **E2E**：真实服务 + 容器化外部依赖

### 6.1 API 集成测试（apps/api，最高优先）
| 测试类型 | 内容 |
|---------|------|
| Controller 单元 | 请求处理、参数校验、响应结构（mock service） |
| Service 集成 | 业务服务 ↔ 真实 entities/redis/typeorm（sqlite 或 mock 连接） |
| 契约测试 | `@sker/sdk` 控制器 ↔ `@sker/api` 实现一致（SDK 驱动开发） |

### 6.2 E2E 端到端测试（apps/tests + docker-compose）
利用现有 `docker-compose.yml`（PostgreSQL/RabbitMQ/Redis）启动真实依赖，验证**完整业务流**：

1. **认证流**：注册/登录 → better-auth 签发 token → 携带 token 访问受保护接口
2. **爬虫→分析→入库流**：crawler 调度 → 微博爬取 → nlp 分析 → entities 入库 → api 查询返回
3. **工作流执行流**：api 提交工作流 → workflow-run 执行节点 → 结果回调/持久化
4. **前端→API 流**（Playwright）：app/bigscreen 页面 → API 请求 → 渲染（jsdom 之外的浏览器环境）
5. **Worker 代理流**：worker 边缘代理 → 上游请求 → 响应

**E2E 完成标准**：核心业务流（1-3）端到端通过；前端流（4）关键页面可交互；数据在真实 DB 中可查询验证。

## 七、测试基础设施

| 项 | 方案 |
|----|------|
| 测试框架 | vitest（全仓统一，4.1.10） |
| 浏览器测试 | Playwright（apps/api、crawler-core 已有依赖） |
| 外部依赖 | docker-compose（PostgreSQL/RabbitMQ/Redis 已有配置） |
| 数据库测试 | 集成/E2E 用真实 PG；单元用 sqlite 或 mock typeorm |
| 契约测试 | `@sker/sdk` 类型 ↔ 实现（apps/tests） |
| 覆盖率 | 每层 gate 时收集 v8 coverage |

## 八、执行顺序与 CI

```
1. pnpm --filter "L0包" test      # 逐包单元测试
2. pnpm --filter "L1包" test      # 数据/服务层
3. pnpm --filter "L2包" test      # 业务引擎
4. pnpm --filter "L3应用" test    # 应用层集成
5. docker compose up -d && pnpm --filter @sker/tests test   # E2E
```

**门禁**：每层 test + check-types + lint 全绿才进入下一层。任一失败，定位到所在层或下层修复。

**优先级建议**（按缺口与价值）：
1. **L0**：`mq`、`utils`（0 测试，基础被广泛依赖）
2. **L1**：`redis`、`sdk`、`nlp`（0 测试，被 L2/L3 大量依赖）
3. **L2**：`workflow-run` 补齐、`agent` 新增
4. **L3**：api 集成补强 + E2E 核心流

## 附：当前测试覆盖现状（扫描）
- **有测试**：api 47、workflow-run 28、bigscreen 23、workflow-ui 19、store 10、ip-proxy 8、ui 8、entities 7、workflow-compiler 6、compiler 4、core 4、cli 3、workflow-ast 2、tests 2、auth/crawler-core/json-harmony/workflow/app/crawler/worker 各 1
- **无测试（缺口）**：`mq`、`utils`、`redis`、`sdk`、`nlp`、`agent`、`aui`、`email`、`llm-protocol`、`pageindex`、`workflow-browser`、apps/cli、email-d1、storybook
