# 路由参数迁移指南

## 背景

Better Auth 不支持 Express 风格的路径参数（如 `:id`），需要使用查询参数代替。

## 迁移规则

### 旧方式（不支持）

```typescript
@Get(':id/keywords')
getEventKeywords(@Param('id') id: string): Promise<...>
```

路径: `/api/auth/events/:id/keywords`

**问题:** Better Auth 的路由系统不支持路径参数，这会导致路由无法匹配。

### 新方式（推荐）

```typescript
@Get('keywords')
getEventKeywords(@Query('id') id: string): Promise<...>
```

路径: `/api/auth/events/keywords?id=xxx`

**优势:**
- Better Auth 兼容
- SDK 客户端自动处理参数转换
- 前端调用代码无需修改

## 实施检查清单

### SDK 定义（packages/sdk/src/controllers/xxx.controller.ts）

- [ ] 将 `@Param('id')` 改为 `@Query('id')`
- [ ] 移除路由路径中的 `:id/` 前缀
- [ ] 确保 `id` 参数类型为 `string`

示例：

```typescript
// ❌ 旧方式
@Controller('events')
export class EventsController {
  @Get(':id/keywords')
  getEventKeywords(@Param('id') id: string): Promise<KeywordItem[]> {
    throw new Error('method getEventKeywords not implements')
  }
}

// ✅ 新方式
@Controller('events')
export class EventsController {
  @Get('keywords')
  getEventKeywords(@Query('id') id: string): Promise<KeywordItem[]> {
    throw new Error('method getEventKeywords not implements')
  }
}
```

### API 实现（apps/api/src/controllers/xxx.controller.ts）

- [ ] 将 `@Param('id')` 改为 `@Query('id')`
- [ ] 移除路由路径中的 `:id/` 前缀
- [ ] 确保实现类继承自 SDK 控制器

示例：

```typescript
// ❌ 旧方式
@Controller(sdk.EventsController)
export class EventsController implements sdk.EventsController {
  async getEventKeywords(id: string) { // 注意：这里没有 @Param 装饰器
    return this.eventsService.getKeywords(id)
  }
}

// ✅ 新方式
@Controller(sdk.EventsController)
export class EventsController implements sdk.EventsController {
  async getEventKeywords(id: string) { // 注意：这里没有 @Query 装饰器
    return this.eventsService.getKeywords(id)
  }
}
```

**重要说明:** 在 API 实现类中，方法签名不需要装饰器（`@Query`），装饰器只在 SDK 定义中需要。

### 测试验证

- [ ] 使用 Postman/curl 测试所有端点
- [ ] 验证前端调用正常工作
- [ ] 检查类型推断是否正确

测试示例：

```bash
# 测试关键词端点
curl "http://localhost:3000/api/auth/events/keywords?id=event-123"

# 应该返回关键词数据，而不是 404
```

## 常见问题

### Q: 为什么不使用路径参数？

**A:** Better Auth 使用自己的路由系统，不支持 Express 风格的路径参数（如 `:id`）。使用查询参数是唯一可靠的方式。

### Q: 前端代码需要修改吗？

**A:** 不需要。SDK 客户端使用装饰器元数据自动生成 HTTP 请求，会自动处理参数转换。前端调用代码保持不变：

```typescript
// 前端代码（无需修改）
const c = root.get(EventsController)
const keywords = await c.getEventKeywords('event-123')
```

### Q: 如何批量迁移多个控制器？

**A:** 使用以下脚本快速查找所有需要迁移的控制器：

```bash
# 查找所有使用 @Param 的控制器
grep -r "@Param('id')" packages/sdk/src/controllers/

# 对于每个找到的文件，按照上述规则进行修改
```

## 相关文档

- [项目开发规范](../../../CLAUDE.md)
- [SDK 驱动开发指南](../../../CLAUDE.md#api-开发规范---sdk-驱动开发)
