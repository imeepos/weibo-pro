# 需要修改路由参数的控制器列表

## 问题背景

Better Auth 与动态路由冲突。所有使用 `:id`、`:platform` 等路径参数的控制器需要改为查询参数，以避免与 Better Auth 的 `/*` 路由冲突。

## 修改原则

1. **路径参数 → 查询参数**: 将 `:id`、`:platform` 等路径参数改为查询参数
2. **同时修改 SDK 和 API**: 保持前后端类型一致
3. **测试每个端点**: 确保修改后功能正常

## 已完成 ✅

### EventsController
- **文件**: `packages/sdk/src/controllers/events.controller.ts`
- **受影响路由**: 18 个
- **状态**: 已修复
- **路由列表**:
  - `GET /events/:id` → `GET /events?id=`
  - `GET /events/:id/timeseries` → `GET /events/timeseries?id=`
  - `GET /events/:id/trends` → `GET /events/trends?id=`
  - `GET /events/:id/influence-users` → `GET /events/influence-users?id=`
  - `GET /events/:id/geographic` → `GET /events/geographic?id=`
  - `GET /events/:id/keywords` → `GET /events/keywords?id=`
  - `GET /events/:id/sentiment-hotness` → `GET /events/sentiment-hotness?id=`
  - `GET /events/:id/sentiment-distribution` → `GET /events/sentiment-distribution?id=`
  - `GET /events/:id/sentiment-intensity` → `GET /events/sentiment-intensity?id=`
  - `GET /events/:id/keywords-timeseries` → `GET /events/keywords-timeseries?id=`
  - `GET /events/:id/keywords-by-sentiment` → `GET /events/keywords-by-sentiment?id=`
  - `GET /events/:id/negative-keywords` → `GET /events/negative-keywords?id=`
  - `GET /events/:id/event-types` → `GET /events/event-types?id=`
  - `GET /events/:id/engagement-trend` → `GET /events/engagement-trend?id=`
  - `GET /events/:id/anomalies` → `GET /events/anomalies?id=`
  - `GET /events/:id/peaks` → `GET /events/peaks?id=`
  - `GET /events/:id/user-relations` → `GET /events/user-relations?id=`
  - `DELETE /events/:id` → `DELETE /events?id=`

## 待修改 📋

### 1. PromptRolesController
- **文件**: `packages/sdk/src/controllers/prompt-roles.controller.ts`
- **受影响路由**: 6 个
- **需要修改的路由**:
  - `GET /prompt-roles/:id` → `GET /prompt-roles/findOne?id=`
  - `PUT /prompt-roles/:id` → `PUT /prompt-roles/update?id=`
  - `DELETE /prompt-roles/:id` → `DELETE /prompt-roles/remove?id=`
  - `POST /prompt-roles/:id/skills` → `POST /prompt-roles/skills?id=`
  - `DELETE /prompt-roles/:id/skills/:skillId` → `DELETE /prompt-roles/skills?id=&skillId=`
- **API 实现**: `apps/api/src/controllers/prompt-roles.controller.ts`
- **优先级**: 高

### 2. PromptSkillsController
- **文件**: `packages/sdk/src/controllers/prompt-skills.controller.ts`
- **受影响路由**: 4 个
- **需要修改的路由**:
  - `GET /prompt-skills/:id` → `GET /prompt-skills/findOne?id=`
  - `PUT /prompt-skills/:id` → `PUT /prompt-skills/update?id=`
  - `DELETE /prompt-skills/:id` → `DELETE /prompt-skills/remove?id=`
- **API 实现**: `apps/api/src/controllers/prompt-skills.controller.ts`
- **优先级**: 高

### 3. PersonaController
- **文件**: `packages/sdk/src/controllers/persona.controller.ts`
- **受影响路由**: 2 个
- **需要修改的路由**:
  - `GET /personas/:id/memory-graph` → `GET /personas/memory-graph?id=`
  - `POST /personas/:id/memories` → `POST /personas/memories?id=`
- **API 实现**: `apps/api/src/controllers/persona.controller.ts`
- **优先级**: 中

### 4. LlmProvidersController
- **文件**: `packages/sdk/src/controllers/llm-providers.controller.ts`
- **受影响路由**: 2 个
- **需要修改的路由**:
  - `GET /llm-providers/:id` → `GET /llm-providers/findOne?id=`
  - `POST /llm-providers/:id/score` → `POST /llm-providers/score?id=`
- **API 实现**: `apps/api/src/controllers/llm-providers.controller.ts`
- **优先级**: 中

### 5. LayoutController
- **文件**: `packages/sdk/src/controllers/layout.controller.ts`
- **受影响路由**: 4 个
- **需要修改的路由**:
  - `GET /layout/:id` → `GET /layout/getById?id=`
  - `PUT /layout/:id` → `PUT /layout/update?id=`
  - `DELETE /layout/:id` → `DELETE /layout/delete?id=`
  - `PUT /layout/:id/set-default` → `PUT /layout/set-default?id=`
- **API 实现**: `apps/api/src/controllers/layout.controller.ts`
- **优先级**: 中

### 6. ConfigController
- **文件**: `packages/sdk/src/controllers/config.controller.ts`
- **受影响路由**: 2 个
- **需要修改的路由**:
  - `GET /config/:platform` → `GET /config/get?platform=`
  - `PUT /config/:platform` → `PUT /config/update?platform=`
- **API 实现**: `apps/api/src/controllers/config.controller.ts`
- **优先级**: 高

### 7. CrawlerController
- **文件**: `packages/sdk/src/controllers/crawler.controller.ts`
- **受影响路由**: 2 个
- **需要修改的路由**:
  - `GET /crawler/status/:id` → `GET /crawler/status?id=`
  - `POST /crawler/stop/:id` → `POST /crawler/stop?id=`
- **API 实现**: `apps/api/src/controllers/crawler.controller.ts`
- **优先级**: 高

### 8. LoginController
- **文件**: `packages/sdk/src/controllers/login.controller.ts`
- **受影响路由**: 3 个
- **需要修改的路由**:
  - `POST /login/:platform/qrcode` → `POST /login/qrcode?platform=`
  - `GET /login/:platform/status` → `GET /login/status?platform=`
  - `POST /login/:platform/cookie` → `POST /login/cookie?platform=`
- **API 实现**: `apps/api/src/controllers/login.controller.ts`
- **优先级**: 高

### 9. ClaudeController
- **文件**: `packages/sdk/src/controllers/claude.controller.ts`
- **受影响路由**: 1 个
- **需要修改的路由**:
  - `POST /claude/tasks/:id/complete` → `POST /claude/tasks/complete?id=`
- **注意**: 该路由已经使用了 `@Query('id')`，但路径仍包含 `:id`，需要移除
- **API 实现**: `apps/api/src/controllers/claude.controller.ts`
- **优先级**: 低

## 统计信息

- **已完成控制器**: 1 个 (EventsController)
- **待修改控制器**: 9 个
- **总受影响路由**: 44 个
- **已完成路由**: 18 个
- **待修改路由**: 26 个

## 修改示例

参考 EventsController 的修改方式：

### SDK 修改前
```typescript
@Get(':id')
findOne(@Param('id') id: string): Promise<EventEntity> {
  throw new Error('method findOne not implements')
}
```

### SDK 修改后
```typescript
@Get('findOne')
findOne(@Query('id') id: string): Promise<EventEntity> {
  throw new Error('method findOne not implements')
}
```

### API 修改前
```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.eventsService.findOne(id)
}
```

### API 修改后
```typescript
@Get('findOne')
async findOne(@Query('id') id: string) {
  return this.eventsService.findOne(id)
}
```

## 下一步行动

1. 按优先级顺序修改各控制器
2. 每个控制器修改后进行测试
3. 更新此文档的完成状态
4. 提交代码时引用此文档
