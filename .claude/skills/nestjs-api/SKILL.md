---
name: nestjs-api
description: 创建 NestJS 控制器和服务，实现 RESTful API 端点。当需要添加新的 API 接口、创建控制器、或实现业务服务时使用。
---

# NestJS 后端开发

本项目 NestJS 作为 HTTP 层 facade，业务服务由 @sker/core 管理。

## 文件位置

- 控制器：`apps/api/src/controllers/`
- 服务：`apps/api/src/services/`
- 模块：`apps/api/src/app.module.ts`

## 控制器模板

```typescript
import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { root } from '@sker/core';
import { MyService } from '../services/my.service';
import * as sdk from '@sker/sdk';

@Controller('api/resources')
export class ResourcesController implements sdk.ResourcesController {
  private myService: MyService;

  constructor() {
    this.myService = root.get(MyService);
  }

  @Get('list')
  async getList(@Query('timeRange') timeRange?: string) {
    const validTimeRange = this.validateTimeRange(timeRange);
    return this.myService.getList(validTimeRange);
  }

  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.myService.getDetail(id);
  }

  @Post()
  async create(@Body() body: sdk.CreateResourceDto) {
    return this.myService.create(body);
  }

  private validateTimeRange(timeRange?: string): TimeRange {
    const validRanges = ['1h', '6h', '12h', '24h', '7d', '30d'];
    return validRanges.includes(timeRange as any) ? timeRange : '24h';
  }
}
```

## 服务模板

```typescript
import { Injectable } from '@sker/core';
import { useEntityManager, MyEntity } from '@sker/entities';
import { logger } from '../utils/logger';

@Injectable({ providedIn: 'root' })
export class MyService {
  async getList(timeRange: string): Promise<MyEntity[]> {
    return useEntityManager(async (manager) => {
      return manager.find(MyEntity, {
        where: { /* 条件 */ },
        order: { created_at: 'DESC' },
      });
    });
  }

  async getDetail(id: string): Promise<MyEntity | null> {
    return useEntityManager(async (manager) => {
      return manager.findOne(MyEntity, { where: { id } });
    });
  }

  async create(data: CreateDto): Promise<MyEntity> {
    return useEntityManager(async (manager) => {
      const entity = manager.create(MyEntity, data);
      await manager.save(entity);
      logger.info('Entity created', { id: entity.id });
      return entity;
    });
  }
}
```

## 模块注册

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { root } from '@sker/core';

@Module({
  controllers: [ResourcesController],
  providers: [
    { provide: MyService, useFactory: () => root.get(MyService) },
  ],
})
export class AppModule {}
```

## API 路由设计

- 路由前缀统一为 `api/`
- 资源名使用复数形式
- RESTful 风格：
  - `GET /api/resources` - 列表
  - `GET /api/resources/:id` - 详情
  - `POST /api/resources` - 创建
  - `PUT /api/resources/:id` - 更新
  - `DELETE /api/resources/:id` - 删除

## SDK 类型约束

控制器实现 SDK 定义的接口，确保前后端类型一致：

```typescript
// packages/sdk/src/types.ts
export interface ResourcesController {
  getList(timeRange?: string): Promise<Resource[]>;
  getDetail(id: string): Promise<Resource | null>;
}
```

## 关键要点

1. **服务通过 `root.get()` 获取**
2. **始终验证和转换输入参数**
3. **业务逻辑放在服务层，控制器只处理 HTTP**
4. **使用统一的 logger 记录关键操作**

## 参考实现

- `apps/api/src/controllers/events.controller.ts`
- `apps/api/src/services/workflow.service.ts`
