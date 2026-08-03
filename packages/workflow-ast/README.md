# @sker/workflow-ast

工作流节点（AST 类）定义包：每个 AST 类代表工作流画布中一个可拖拽节点，通过装饰器元数据驱动节点注册、类型推断与执行调度。

## 核心职责

- **节点定义**：以类型化类（继承 `@sker/workflow` 的 `Ast`）定义全部业务节点，覆盖微博爬虫、LLM、舆情分析、控制流、调度、基础工具等场景
- **装饰器契约**：通过 `@Node` / `@Input` / `@Output` / `@State` 声明节点身份、数据流端口（含聚合模式 `IS_MULTI`/`IS_BUFFER`）、路由与条件输出、错误策略
- **按 type 分类组织**：目录结构与 `@Node({ type })` 分类一致，与 UI 节点面板保持对应
- **统一导出**：`src/index.ts` 保持向后兼容地导出所有节点类与相关类型
- **序列化契约**：节点 `toJSON()` 排除 BehaviorSubject 等运行时对象，保证持久化数据纯净

## 目录结构

```
packages/workflow-ast/src/
├── index.ts            # 统一导出入口（保持向后兼容）
├── llm/                # 【LLM 节点】大模型相关（23 个）：LlmTextAgentAst、PersonaAst、StoryWeaverAst、CodeGeneratorAst、LlmStructuredOutputAst 等
├── crawler/            # 【爬虫节点】微博数据采集（18 个）：WeiboLoginAst、WeiboKeywordSearchAst、WeiboAjax*Ast、PostNLPAnalyzerAst、EventDispatcherAst 等
├── basic/              # 【基础节点】通用功能（12 个）：SqlExecuteAst、ExcelUploadAst、ShareAst、ClaudeCodeAst、EventEmitterAst、SmartAstV1 等
├── sentiment/          # 【舆情节点】舆情分析专家（6 个）：KeywordAgentAst、MediaAgentAst、ForumAgentAst、ReportAgentAst 等
│                       #   （另有 AgentAst 抽象基类，供各舆情 Agent 继承）
├── control/            # 【控制节点】流程控制（1 个）：StoryQualityLoopAst
├── analysis/           # 【分析节点】数据分析（1 个）：SerpClusterAst
├── scheduler/          # 【调度节点】定时任务（1 个）：ScheduledWorkflowAst
└── meta/               # 【Meta 节点】元编程（7 个）：LlmInferenceAst、TransformAst、RouteAst、AggregateAst、HttpRequestAst、HtmlDisplayAst、JsonDisplayAst
```

> 注：分类中的 `llm/crawler/basic/...` 对应 `@Node({ type: 'xxx' })` 的 type 字段；具体执行器（Visitor）在 `@sker/workflow-run`（后端）与 `@sker/workflow-browser`（前端）中实现。

## 边界

- **✅ 负责**：定义节点类型、输入/输出/状态端口、节点元数据（装饰器）、节点的 JSON 序列化行为；提供所有业务节点的类型化定义
- **❌ 不负责**：引擎核心（AST 基类与执行调度，属于 `@sker/workflow`）、节点执行逻辑（属于 `@sker/workflow-run` / `@sker/workflow-browser`）、前端渲染（属于 `@sker/workflow-ui`）、DSL 编译（属于 `@sker/workflow-compiler`）
- **对外依赖**：`@sker/workflow`（Ast 基类与装饰器）、`@sker/core`（DI）、`@sker/nlp`（NLP 相关节点）、rxjs
- **被谁依赖**：`@sker/workflow-run`、`@sker/workflow-browser`、`@sker/workflow-ui`、`@sker/sdk`；apps：`api`、`crawler`、`bigscreen`、`storybook`

---

## 节点类型一览

### LLM 节点（`llm/`，23 个）
文本大模型（`LlmTextAgentAst`）、结构化输出（`LlmStructuredOutputAst`）、角色记忆（`PersonaAst`/`PersonaCreatorAst`）、图/视频/音频/视频生成（`LlmImageToTextAst`、`LlmTextToImageAst` 等）、代码生成（`CodeGeneratorAst`）、故事编织（`StoryWeaverAst`）、研究规划（`ResearchPlannerAst`）、答案评估/终稿（`AnswerEvaluatorAst`/`AnswerFinalizerAst`）等

### 爬虫节点（`crawler/`，18 个）
微博登录（`WeiboLoginAst`）、关键词搜索（`WeiboKeywordSearchAst`）、博文详情/评论/点赞/转发/关注关系/用户信息/热门时间线等 `WeiboAjax*Ast` 系列、帖子上下文收集（`PostContextCollectorAst`）、NLP 分析（`PostNLPAnalyzerAst`）、事件分发（`EventDispatcherAst`）等

### 基础节点（`basic/`，12 个）
SQL 执行（`SqlExecuteAst`）、Excel 上传、Markdown 上传、分享（`ShareAst`）、事件（`EventAst`）、属性选择（`PropertySelectorAst`）、取最后值（`LastAst`）、Claude Code 执行（`ClaudeCodeAst`）、统计重算（`RecalculateStatisticsAst`）、事件发射（`EventEmitterAst`）等

### 其他节点
- 舆情（`sentiment/`）：`KeywordAgentAst`、`MediaAgentAst`、`ForumAgentAst`、`QueryAgentAst`、`ReportAgentAst`、`InsightAgentAst`
- 控制流（`control/`）：`StoryQualityLoopAst`
- 分析（`analysis/`）：`SerpClusterAst`
- 调度（`scheduler/`）：`ScheduledWorkflowAst`
- Meta（`meta/`）：`LlmInferenceAst`、`TransformAst`、`RouteAst`、`AggregateAst`、`HttpRequestAst`、`HtmlDisplayAst`、`JsonDisplayAst`

## 核心装饰器（来自 @sker/workflow）

- `@Node({ title, type, errorStrategy, maxRetries, dynamicInputs, dynamicOutputs })`：声明节点身份与错误策略
- `@Input({ title, type, defaultValue, mode, required, dynamic })`：定义数据流入口与聚合方式（`IS_MULTI` 多边聚合 / `IS_BUFFER` 多次发射聚合）
- `@Output({ title, defaultValue, type, isRouter, condition, dynamic })`：定义数据流出口（`isRouter` 路由过滤 undefined、`condition` 条件输出）
- `@State({ title })`：标记运行时内部状态，不参与数据流传递

## 开发

```bash
# 构建
pnpm build

# 开发模式（监听文件变化）
pnpm dev

# 类型检查
pnpm check-types

# 代码检查
pnpm lint
```
