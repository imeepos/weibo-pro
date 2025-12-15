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

## 核心机制

### 1. 装饰器元数据驱动

SDK 的核心魔法在于 `client.ts` 中的 `createControllerInstance` 函数：

```typescript
// 运行时解析装饰器元数据，自动生成 HTTP 客户端
function createControllerInstance<T>(controllerClass: new () => T, axiosInstance: AxiosInstance): T {
  const instance = Object.create(controllerClass.prototype);

  // 1. 读取 @Controller 装饰器的路径前缀
  const controllerPrefix = Reflect.getMetadata(PATH_METADATA, controllerClass) || '';

  // 2. 遍历所有方法
  const methodNames = Object.getOwnPropertyNames(controllerClass.prototype).filter(
    name => name !== 'constructor'
  );

  for (const methodName of methodNames) {
    // 3. 读取 @Get/@Post/@Put/@Delete/@Sse 装饰器
    const methodPath = Reflect.getMetadata(PATH_METADATA, originalMethod) || '/';
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, originalMethod);
    const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, originalMethod) || {};

    // 4. 根据 HTTP 方法类型生成对应的请求函数
    if (httpMethod === RequestMethod.SSE) {
      // SSE 方法返回 Observable
      instance[methodName] = function (...args: any[]) {
        return new Observable<any>(subscriber => { /* ... */ });
      };
    } else {
      // 普通 HTTP 请求返回 Promise
      instance[methodName] = async function (...args: any[]) {
        const response = await axiosInstance.request(config);
        return response.data.data;  // 自动解包 { success, data } 格式
      };
    }
  }

  return instance;
}
```

### 2. Provider 工厂函数

`providers()` 函数生成 DI 容器所需的 Provider 配置：

```typescript
export const providers: (config?: AxiosRequestConfig) => Provider[] = (config = { baseURL: '/' }) => {
  const controllers = root.get(CONTROLLES, [])  // 从全局容器获取所有 Controller
  return [
    { provide: AXIOS, useFactory: (config) => axios.create(config), deps: [AXIOS_CONFIG] },
    { provide: AXIOS_CONFIG, useValue: config },
    ...controllers.map(controller => ({
      provide: controller,
      useFactory: (axiosInstance: AxiosInstance) => {
        return createControllerInstance(controller, axiosInstance);
      },
      deps: [AXIOS]
    }))
  ]
}
```

### 3. SSE 流式响应支持

SDK 原生支持两种 SSE 模式：

- **GET SSE**：使用浏览器 EventSource API
- **POST SSE**：使用 Fetch API + ReadableStream（支持 JSON Body 传递复杂数据）

```typescript
// 工作流执行（POST SSE）
@Sse('execute')
execute(@Body() body: ExecuteWorkflowPayload): Observable<NodeEvent> { /* ... */ }

// 客户端调用
workflowController.execute({ ast, workflow }).subscribe({
  next: (event) => console.log('节点事件:', event),
  complete: () => console.log('工作流执行完成')
});
```

## API 方法列表

### ChartsController (`api/charts`)

图表数据 API，支持时间范围过滤。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getAgeDistribution` | `GET /age-distribution` | `timeRange?` | `Promise<ChartData>` | 年龄分布数据 |
| `getGenderDistribution` | `GET /gender-distribution` | `timeRange?` | `Promise<GenderDistributionData>` | 性别分布 |
| `getSentimentTrend` | `GET /sentiment-trend` | `timeRange?` | `Promise<SentimentTrendData>` | 情感趋势 |
| `getGeographic` | `GET /geographic` | `timeRange?` | `Promise<GeographicData>` | 地理分布 |
| `getEventTypes` | `GET /event-types` | `timeRange?` | `Promise<EventTypeData>` | 事件类型统计 |
| `getWordCloud` | `GET /word-cloud` | `timeRange?, limit?` | `Promise<WordCloudItem[]>` | 词云数据 |
| `getEventCountSeries` | `GET /event-count-series` | `timeRange?` | `Promise<TimeSeriesData>` | 事件数时间序列 |
| `getPostCountSeries` | `GET /post-count-series` | `timeRange?` | `Promise<TimeSeriesData>` | 帖子数时间序列 |
| `getSentimentData` | `GET /sentiment-data` | `timeRange?` | `Promise<SentimentScore>` | 情感统计数据 |
| `getBatchCharts` | `GET /batch` | `timeRange?` | `Promise<Object>` | 批量获取所有图表 |

### EventsController (`api/events`)

舆情事件数据 API。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getEventList` | `GET /list` | `timeRange?` | `Promise<EventListItem[]>` | 事件列表 |
| `getEventCategories` | `GET /categories` | `timeRange?` | `Promise<EventCategoryStats>` | 事件分类统计 |
| `getTrendData` | `GET /trend-data` | `timeRange?` | `Promise<TrendDataSeries>` | 趋势数据 |
| `getHotList` | `GET /hot-list` | `timeRange?` | `Promise<HotEvent[]>` | 热门事件榜 |
| `getEventDetail` | `GET /:id` | `id` | `Promise<EventDetail>` | 事件详情（含时间线） |
| `getEventTimeSeries` | `GET /:id/timeseries` | `id` | `Promise<TimeSeriesData>` | 事件时间序列 |
| `getEventTrends` | `GET /:id/trends` | `id` | `Promise<TrendAnalysis>` | 事件趋势分析 |
| `getInfluenceUsers` | `GET /:id/influence-users` | `id` | `Promise<InfluenceUser[]>` | 事件关键用户 |
| `getEventGeographic` | `GET /:id/geographic` | `id` | `Promise<GeographicDistribution[]>` | 事件地理分布 |
| `getEventKeywords` | `GET /:id/keywords` | `id` | `Promise<Array<KeywordData>>` | 事件关键词 |

### KeywordsController (`api/keywords`)

关键词数据 API。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getWordCloud` | `GET /wordcloud` | `maxWords?` | `Promise<KeywordWordCloudItem[]>` | 关键词词云 |

### LayoutController (`api/layout`)

布局配置 CRUD API（用于大屏布局持久化）。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getLayouts` | `GET /` | `type?` | `Promise<LayoutConfiguration[]>` | 获取布局列表 |
| `getDefaultLayout` | `GET /default` | `type?` | `Promise<LayoutConfiguration>` | 获取默认布局 |
| `getLayoutById` | `GET /:id` | `id` | `Promise<LayoutConfiguration>` | 获取指定布局 |
| `createLayout` | `POST /` | `CreateLayoutPayload` | `Promise<LayoutConfiguration>` | 创建布局 |
| `updateLayout` | `PUT /:id` | `id, UpdateLayoutPayload` | `Promise<LayoutConfiguration>` | 更新布局 |
| `deleteLayout` | `DELETE /:id` | `id` | `Promise<void>` | 删除布局 |
| `setDefaultLayout` | `PUT /:id/set-default` | `id, type?` | `Promise<LayoutConfiguration>` | 设置为默认 |

### LlmModelsController (`api/llm-models`)

LLM 模型管理 CRUD。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `findAll` | `GET /` | - | `Promise<LlmModel[]>` | 获取所有模型 |
| `findOne` | `GET /:id` | `id` | `Promise<LlmModel \| null>` | 获取单个模型 |
| `create` | `POST /` | `Partial<LlmModel>` | `Promise<LlmModel>` | 创建模型 |
| `update` | `PUT /:id` | `id, Partial<LlmModel>` | `Promise<LlmModel>` | 更新模型 |
| `remove` | `DELETE /:id` | `id` | `Promise<void>` | 删除模型 |

### LlmProvidersController (`api/llm-providers`)

LLM 提供商管理（含健康评分）。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `findAll` | `GET /` | - | `Promise<LlmProvider[]>` | 获取所有提供商 |
| `findOne` | `GET /:id` | `id` | `Promise<LlmProvider \| null>` | 获取单个提供商 |
| `create` | `POST /` | `Partial<LlmProvider>` | `Promise<LlmProvider>` | 创建提供商 |
| `update` | `PUT /:id` | `id, Partial<LlmProvider>` | `Promise<LlmProvider>` | 更新提供商 |
| `remove` | `DELETE /:id` | `id` | `Promise<void>` | 删除提供商 |
| `getBestProvider` | `GET /available/best` | - | `Promise<LlmProvider \| null>` | 获取最佳提供商（按 score 排序） |
| `updateScore` | `PUT /:id/score` | `id, score` | `Promise<void>` | 更新健康评分 |

### LlmModelProvidersController (`api/llm-model-providers`)

模型-提供商关联管理（多对多关系）。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `findAll` | `GET /` | - | `Promise<LlmModelProviderWithRelations[]>` | 获取所有关联 |
| `findByModel` | `GET /by-model/:modelId` | `modelId` | `Promise<LlmModelProviderWithRelations[]>` | 按模型查询 |
| `findByProvider` | `GET /by-provider/:providerId` | `providerId` | `Promise<LlmModelProviderWithRelations[]>` | 按提供商查询 |
| `findOne` | `GET /:id` | `id` | `Promise<LlmModelProviderWithRelations \| null>` | 获取单个关联 |
| `create` | `POST /` | `CreateDto` | `Promise<LlmModelProvider>` | 创建关联 |
| `update` | `PUT /:id` | `id, UpdateDto` | `Promise<LlmModelProvider>` | 更新关联 |
| `remove` | `DELETE /:id` | `id` | `Promise<void>` | 删除关联 |

### LlmChatLogsController (`api/llm-chat-logs`)

LLM 调用日志统计分析。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getStats` | `GET /stats` | `startDate?, endDate?, granularity?` | `Promise<LlmChatLogStats>` | 统计数据（按模型/提供商/时间聚合） |
| `list` | `GET /` | `LlmChatLogQuery` | `Promise<LlmChatLogListResult>` | 日志列表（分页） |
| `analyzePrompts` | `GET /analyze-prompts` | `startDate?, endDate?, modelName?, providerId?` | `Promise<PromptAnalysisResult>` | Prompt 使用分析 |

### OverviewController (`api/overview`)

概览数据 API（大屏首页）。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getStatistics` | `GET /statistics` | `timeRange?` | `Promise<OverviewStatisticsData>` | 核心指标统计 |
| `getSentiment` | `GET /sentiment` | `timeRange?` | `Promise<OverviewSentiment>` | 总体情感分布 |
| `getLocations` | `GET /locations` | `timeRange?` | `Promise<OverviewLocation[]>` | 地域分布 TOP 10 |

### SentimentController (`api/sentiment`)

情感分析 API。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getRealtimeData` | `GET /realtime` | `timeRange?` | `Promise<SentimentRealTimeData>` | 实时情感数据 |
| `getStatistics` | `GET /statistics` | `timeRange?` | `Promise<SentimentStatistics>` | 情感统计 |
| `getHotTopics` | `GET /hot-topics` | `timeRange?` | `Promise<HotTopicItem[]>` | 热门话题 |
| `getKeywords` | `GET /keywords` | `timeRange?` | `Promise<WordCloudItem[]>` | 情感关键词 |
| `getTimeSeries` | `GET /time-series` | `timeRange?` | `Promise<SentimentTimeSeriesItem[]>` | 时间序列 |
| `getLocations` | `GET /locations` | `timeRange?` | `Promise<SentimentLocationData[]>` | 地域情感分布 |
| `getRecentPosts` | `GET /recent-posts` | `timeRange?` | `Promise<RecentPost[]>` | 最新帖子 |
| `search` | `POST /search` | `keyword, timeRange?` | `Promise<SearchResult>` | 关键词搜索 |

### SystemController (`api/system`)

系统状态监控 API。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getSystemStatus` | `GET /status` | - | `Promise<SystemStatus>` | 系统状态 |
| `getPerformance` | `GET /performance` | - | `Promise<SystemPerformance>` | 性能指标 |
| `getHealth` | `GET /health` | - | `Promise<SystemHealth>` | 健康检查 |

### UploadController (`api/upload`)

文件上传 API（支持 FormData 和 Base64）。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `uploadFile` | `POST /file` | `FormData` | `Promise<UploadFileResponse>` | 上传文件 |
| `uploadBase64` | `POST /base64` | `UploadBase64Request` | `Promise<UploadFileResponse>` | 上传 Base64 图片 |

### UserRelationController (`api/user-relations`)

用户关系网络可视化。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getNetwork` | `GET /` | `type?, timeRange?, minWeight?, limit?` | `Promise<UserRelationNetwork>` | 用户关系网络（节点+边） |

### UsersController (`api/users`)

用户数据 API。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getUserList` | `GET /list` | `timeRange?` | `Promise<UserListResponse>` | 用户列表（分页） |
| `getRiskLevels` | `GET /risk-levels` | `timeRange?` | `Promise<RiskLevelConfig[]>` | 风险等级配置 |
| `getStatistics` | `GET /statistics` | `timeRange?` | `Promise<UserStatistics>` | 用户统计 |

### WorkflowController (`api/workflow`)

工作流引擎 API（核心模块，含 SSE 流式执行）。

#### 基础 CRUD

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `saveWorkflow` | `POST /save` | `WorkflowGraphAst` | `Promise<WorkflowEntity>` | 保存工作流 |
| `getWorkflow` | `GET /get` | `name` | `Promise<WorkflowGraphAst \| null>` | 获取工作流 |
| `listWorkflows` | `GET /list` | - | `Promise<WorkflowSummary[]>` | 工作流列表 |
| `deleteWorkflow` | `DELETE /delete/:id` | `id` | `Promise<{ success: boolean }>` | 删除工作流 |
| `initWorkflow` | `GET /init` | `name` | `Promise<InitWorkflowResponse>` | 初始化工作流模板 |
| `listTemplates` | `GET /templates` | - | `Promise<WorkflowTemplate[]>` | 获取模板列表 |
| `getAvailableNodes` | `GET /nodes` | - | `Promise<WorkflowNodeInfo[]>` | 获取所有可用节点类型 |

#### 工作流执行

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `execute` | `SSE /execute` | `ExecuteWorkflowPayload` | `Observable<NodeEvent>` | 执行完整工作流（SSE 流式） |
| `executeNode` | `SSE /executeNode` | `ExecuteNodePayload` | `Observable<NodeEvent>` | 执行单个节点（微调模式） |
| `fineTuneNode` | `SSE /runs/:runId/fine-tune/:nodeId` | `runId, nodeId, FineTunePayload` | `Observable<NodeEvent>` | 节点微调（智能重放） |

#### 运行实例管理

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `createRun` | `POST /:id/runs` | `workflowId, inputs?` | `Promise<CreateRunResult>` | 创建运行实例 |
| `executeRun` | `POST /runs/:runId/execute` | `runId` | `Promise<WorkflowRunEntity>` | 执行运行实例 |
| `getRun` | `GET /runs/:runId` | `runId` | `Promise<WorkflowRunEntity>` | 获取运行详情 |
| `listRuns` | `GET /:id/runs` | `workflowId, page?, pageSize?, status?, scheduleId?` | `Promise<ListRunsResult>` | 运行历史列表 |
| `cancelRun` | `POST /runs/:runId/cancel` | `runId` | `Promise<{ success: boolean }>` | 取消运行 |

#### 调度管理

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `createSchedule` | `POST /:name/schedules` | `workflowName, CreateScheduleDto` | `Promise<WorkflowScheduleEntity>` | 创建调度任务 |
| `listSchedules` | `GET /:name/schedules` | `workflowName` | `Promise<WorkflowScheduleEntity[]>` | 调度任务列表 |
| `getSchedule` | `GET /schedules/:scheduleId` | `scheduleId` | `Promise<WorkflowScheduleEntity>` | 调度详情 |
| `updateSchedule` | `PUT /schedules/:scheduleId` | `scheduleId, UpdateScheduleDto` | `Promise<WorkflowScheduleEntity>` | 更新调度 |
| `deleteSchedule` | `DELETE /schedules/:scheduleId` | `scheduleId` | `Promise<{ success: boolean }>` | 删除调度 |
| `enableSchedule` | `POST /schedules/:scheduleId/enable` | `scheduleId` | `Promise<WorkflowScheduleEntity>` | 启用调度 |
| `disableSchedule` | `POST /schedules/:scheduleId/disable` | `scheduleId` | `Promise<WorkflowScheduleEntity>` | 禁用调度 |
| `triggerSchedule` | `POST /schedules/:scheduleId/trigger` | `scheduleId, inputs?` | `Promise<TriggerResult>` | 手动触发调度 |

### PersonaController (`api/personas`)

Persona 记忆图谱 API（基于图数据库）。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `getPersonaList` | `GET /` | - | `Promise<PersonaListItem[]>` | Persona 列表 |
| `getMemoryGraph` | `GET /:id/memory-graph` | `id` | `Promise<PersonaMemoryGraph>` | 记忆图谱（节点+边） |
| `retrieveMemories` | `POST /retrieve-memories` | `RetrieveMemoriesRequest` | `Promise<RetrieveMemoriesResponse>` | 记忆检索（带深度遍历） |
| `createMemory` | `POST /:id/memories` | `id, CreateMemoryRequest` | `Promise<MemoryNode>` | 创建记忆节点 |

### PromptRolesController (`api/prompt-roles`)

Prompt 角色管理（角色-技能关联）。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `findAll` | `GET /` | - | `Promise<PromptRoleWithSkills[]>` | 获取所有角色 |
| `findOne` | `GET /:id` | `id` | `Promise<PromptRoleWithSkills \| null>` | 获取单个角色 |
| `create` | `POST /` | `Partial<PromptRoleEntity>` | `Promise<PromptRoleEntity>` | 创建角色 |
| `update` | `PUT /:id` | `id, Partial<PromptRoleEntity>` | `Promise<PromptRoleEntity>` | 更新角色 |
| `remove` | `DELETE /:id` | `id` | `Promise<void>` | 删除角色 |
| `addSkill` | `POST /:id/skills` | `roleId, AddSkillDto` | `Promise<PromptRoleSkillRefEntity>` | 为角色添加技能 |
| `removeSkill` | `DELETE /:id/skills/:skillId` | `roleId, skillId` | `Promise<void>` | 移除角色技能 |

### PromptSkillsController (`api/prompt-skills`)

Prompt 技能管理。

| 方法 | 路径 | 参数 | 返回类型 | 说明 |
|------|------|------|----------|------|
| `findAll` | `GET /` | `type?` | `Promise<PromptSkillEntity[]>` | 获取所有技能 |
| `findOne` | `GET /:id` | `id` | `Promise<PromptSkillEntity \| null>` | 获取单个技能 |
| `create` | `POST /` | `Partial<PromptSkillEntity>` | `Promise<PromptSkillEntity>` | 创建技能 |
| `update` | `PUT /:id` | `id, Partial<PromptSkillEntity>` | `Promise<PromptSkillEntity>` | 更新技能 |
| `remove` | `DELETE /:id` | `id` | `Promise<void>` | 删除技能 |

## 使用示例

### 1. 基础配置

```typescript
import { EnvironmentInjector, root } from '@sker/core';
import { providers, ChartsController, WorkflowController } from '@sker/sdk';

// 创建应用级注入器
const appInjector = EnvironmentInjector.create({
  providers: providers({ baseURL: 'http://localhost:3000' }),
  parent: root
});

// 获取控制器实例
const chartsController = appInjector.get(ChartsController);
const workflowController = appInjector.get(WorkflowController);
```

### 2. 普通 API 调用

```typescript
// 获取年龄分布图表数据
const ageData = await chartsController.getAgeDistribution('7d');

// 获取事件详情
const eventDetail = await eventsController.getEventDetail('event-123');
console.log(eventDetail.title, eventDetail.sentiment);

// 上传图片（Base64）
const uploadResult = await uploadController.uploadBase64({
  image: 'data:image/png;base64,...',
  filename: 'test.png'
});
console.log('上传成功:', uploadResult.url);
```

### 3. SSE 流式响应

```typescript
// 执行工作流（实时接收节点事件）
const subscription = workflowController.execute({
  ast: startAst,
  workflow: graphAst,
  input: { keyword: '热点话题' }
}).subscribe({
  next: (event: NodeEvent) => {
    console.log(`节点 ${event.nodeId} 状态: ${event.state}`);
    if (event.state === 'success') {
      console.log('输出数据:', event.result);
    }
  },
  error: (err) => console.error('执行失败:', err),
  complete: () => console.log('工作流执行完成')
});

// 取消订阅（中断 SSE 连接）
subscription.unsubscribe();
```

### 4. 多环境配置

```typescript
// 生产环境
const prodInjector = EnvironmentInjector.create({
  providers: providers({ baseURL: 'https://api.weibo-pro.com' }),
  parent: root
});

// 开发环境（Mock）
const devInjector = EnvironmentInjector.create({
  providers: providers({ baseURL: 'http://localhost:3000' }),
  parent: root
});

// 根据环境切换
const injector = process.env.NODE_ENV === 'production' ? prodInjector : devInjector;
const controller = injector.get(EventsController);
```

### 5. LLM 管理示例

```typescript
// 获取最佳 LLM 提供商
const bestProvider = await llmProvidersController.getBestProvider();
console.log('推荐使用:', bestProvider?.name);

// 更新提供商健康评分
await llmProvidersController.updateScore(bestProvider.id, 95);

// 获取调用日志统计
const stats = await llmChatLogsController.getStats('2024-01-01', '2024-12-31', 'day');
console.log('总请求数:', stats.totalRequests);
console.log('成功率:', stats.successCount / stats.totalRequests);
console.log('按模型统计:', stats.byModel);
```

### 6. Persona 记忆检索

```typescript
// 获取 Persona 记忆图谱
const memoryGraph = await personaController.getMemoryGraph('persona-001');
console.log('记忆节点数:', memoryGraph.memories.length);
console.log('关系边数:', memoryGraph.relations.length);

// 基于刺激检索相关记忆（深度遍历）
const retrieveResult = await personaController.retrieveMemories({
  personaId: 'persona-001',
  stimuli: ['春节', '疫情', '健康'],
  depth: 3,  // 遍历深度
  timeout: 5000
});
console.log('检索到记忆:', retrieveResult.memories);
console.log('上下文总结:', retrieveResult.context);

// 创建新记忆
const newMemory = await personaController.createMemory('persona-001', {
  name: '春节习俗',
  content: '春节期间人们会贴春联、放鞭炮、吃饺子...',
  type: 'fact',
  relatedMemoryIds: ['memory-123', 'memory-456']  // 关联已有记忆
});
```

### 7. 工作流调度

```typescript
// 创建每日定时任务
const schedule = await workflowController.createSchedule('weibo-daily-crawler', {
  name: '每日微博采集',
  scheduleType: 'cron',
  cronExpression: '0 9 * * *',  // 每天 9:00
  inputs: { keyword: '热点新闻', page: 10 },
  startTime: new Date('2024-01-01'),
  endTime: new Date('2025-01-01')
});

// 启用调度
await workflowController.enableSchedule(schedule.id);

// 手动触发调度（覆盖输入参数）
const result = await workflowController.triggerSchedule(schedule.id, {
  inputs: { keyword: '突发事件', page: 50 }
});
console.log('触发成功，运行 ID:', result.runId);

// 查看运行历史
const runs = await workflowController.listRuns({
  workflowId: schedule.workflowId,
  page: 1,
  pageSize: 20,
  status: 'success'
});
console.log('成功运行次数:', runs.total);
```

## 类型定义

`types.ts` 包含 **200+ TypeScript 接口**，覆盖：

- **时间范围**: `TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d'`
- **图表数据**: `ChartData`, `AgeDistributionData`, `SentimentTrendData`, `WordCloudItem`, `TimeSeriesData`
- **事件数据**: `EventListItem`, `EventDetail`, `EventTimelineNode`, `EventPropagationPath`, `TrendAnalysis`
- **用户数据**: `UserListItem`, `UserStatistics`, `RiskLevel`, `InfluenceUser`
- **情感分析**: `SentimentScore`, `SentimentStatistics`, `HotTopicItem`
- **系统监控**: `SystemStatus`, `SystemPerformance`, `SystemHealth`
- **工作流**: `WorkflowGraphAst`, `NodeEvent`, `WorkflowRunEntity`, `WorkflowScheduleEntity`, `RunStatus`
- **LLM 管理**: `LlmModel`, `LlmProvider`, `LlmModelProvider`, `LlmChatLogStats`
- **Persona**: `PersonaMemoryGraph`, `MemoryNode`, `MemoryEdge`, `RetrievedMemory`
- **SSE 事件**: `SSEEvent`, `MessageEvent`, `ProgressData`, `QRCodeData`

所有类型均从 `@sker/sdk` 统一导出，确保前后端类型一致性。

## 技术特性

### 1. 零手写 HTTP 代码

通过装饰器元数据驱动，开发者只需定义 Controller 类和装饰器，无需手写 axios 调用逻辑：

```typescript
// 后端（NestJS）
@Controller('api/events')
export class EventsController {
  @Get('list')
  getEventList(@Query('timeRange') timeRange?: TimeRange): Promise<EventListItem[]> {
    return this.eventsService.findAll(timeRange);
  }
}

// 前端（@sker/sdk）
// 自动生成等价客户端方法
const events = await eventsController.getEventList('7d');
```

### 2. 类型安全

- 编译时类型检查：参数类型、返回值类型、Query/Param/Body 约束
- 智能提示：IDE 自动补全 API 方法和参数
- 重构友好：修改接口定义后，所有调用点自动感知变更

### 3. RxJS Observable 支持

SSE 方法返回 `Observable`，支持 RxJS 操作符：

```typescript
workflowController.execute({ ast, workflow })
  .pipe(
    filter(event => event.state === 'success'),
    map(event => event.result),
    takeUntil(cancelSignal$)
  )
  .subscribe(result => console.log(result));
```

### 4. 自动响应解包

客户端自动处理后端统一响应格式 `{ success: boolean, data: T, message?: string }`：

```typescript
// 后端返回
return { success: true, data: { id: '123', title: '事件标题' } };

// 客户端自动解包为
const event: EventDetail = await eventsController.getEventDetail('123');
// event = { id: '123', title: '事件标题' }
```

### 5. 错误处理

客户端自动抛出异常：

```typescript
try {
  const data = await controller.someMethod();
} catch (error) {
  console.error('API 错误:', error.message);
  // 错误消息格式: "api error: {...}"
}
```

## 依赖关系

```
@sker/sdk
├── @sker/core          # DI 容器 + 装饰器定义
├── @sker/workflow      # 工作流核心（AST 类型）
├── @sker/workflow-ast  # 节点 AST 定义
├── @sker/entities      # TypeORM 实体类型
├── axios               # HTTP 客户端
└── rxjs                # 响应式流（SSE）
```

## 构建产物

通过 `tsup` 构建，输出双模块格式：

- **ESM**: `dist/index.mjs` + `dist/index.d.mts`
- **CJS**: `dist/index.js` + `dist/index.d.ts`

支持 Node.js、浏览器、Webpack、Vite 等环境。

## 设计哲学

**存在即合理**：
- 每个 Controller 对应一个业务领域，职责清晰
- 每个方法对应一个 API 端点，RESTful 风格
- 每个类型定义对应实际数据结构，无冗余字段

**优雅即简约**：
- 无手写 HTTP 胶水代码，装饰器完成一切
- 类型即文档，无需额外 Swagger/OpenAPI 配置
- 流式响应使用 Observable，符合响应式编程理念

**性能即艺术**：
- 编译时元数据收集，运行时零反射开销
- Axios 实例复用，支持连接池和请求拦截
- SSE 支持背压和取消订阅，防止内存泄漏

---

代码即文档 - 此 SDK 不仅是工具，更是 API 设计的艺术品。
