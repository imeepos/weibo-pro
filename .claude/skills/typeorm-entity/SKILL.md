---
name: typeorm-entity
description: 定义 TypeORM 实体、创建数据库订阅者、使用 EntityManager 操作数据库。当需要创建新表、定义实体关系、或实现数据变更监听时使用。
---

# TypeORM 实体定义

本项目使用 TypeORM + PostgreSQL，实体定义在 @sker/entities 包中。

## 文件位置

- 实体：`packages/entities/src/`
- 订阅者：`packages/entities/src/*.subscriber.ts`
- 工具函数：`packages/entities/src/utils.ts`

## 实体定义模板

```typescript
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Entity } from './decorator';

@Entity('table_name')
@Index(['category_id'])
@Index(['status'])
export class MyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // 外键关联
  @Column({ type: 'uuid', name: 'category_id' })
  category_id!: string;

  @ManyToOne(() => CategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity;

  // JSONB 类型
  @Column({ type: 'jsonb', name: 'metadata' })
  metadata!: Record<string, any>;

  // 精度控制
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score!: number;

  // 枚举字段
  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: 'active' | 'inactive' | 'archived';

  // 时间戳
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deleted_at!: Date | null;
}
```

## 订阅者模板

```typescript
import {
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { MyEntity } from './my.entity';

@EventSubscriber()
export class MyEntitySubscriber implements EntitySubscriberInterface<MyEntity> {
  listenTo() {
    return MyEntity;
  }

  async afterInsert(event: InsertEvent<MyEntity>) {
    await this.onEntityChange(event.entity, event.manager);
  }

  async afterUpdate(event: UpdateEvent<MyEntity>) {
    if (!event.entity) return;
    await this.onEntityChange(event.entity as MyEntity, event.manager);
  }

  private async onEntityChange(entity: MyEntity, manager: EntityManager) {
    // 变更处理逻辑，如创建快照、发送消息等
  }
}
```

## 数据库操作

```typescript
import { useEntityManager, useTranslation } from '@sker/entities';

// 简单查询
const results = await useEntityManager(async (m) => {
  return m.find(MyEntity, {
    where: { status: 'active' },
    order: { created_at: 'DESC' },
    take: 100,
  });
});

// 事务操作
const result = await useTranslation(async (m) => {
  const entity = m.create(MyEntity, data);
  await m.save(entity);
  await m.update(RelatedEntity, { id }, updates);
  return entity;
});

// 复杂查询
const posts = await useEntityManager(async (m) => {
  return m.getRepository(MyEntity)
    .createQueryBuilder('e')
    .leftJoinAndSelect('e.category', 'category')
    .where('e.status = :status', { status: 'active' })
    .andWhere('e.created_at > :date', { date: someDate })
    .orderBy('e.created_at', 'DESC')
    .getMany();
});
```

## 命名规范

- 实体类名：`XxxEntity`
- 表名：蛇形复数形式（如 `weibo_posts`）
- 字段名：蛇形命名（如 `created_at`）

## 关键要点

1. **使用 `timestamptz` 而非 `timestamp`**（时区问题）
2. **软删除使用 `@DeleteDateColumn`**
3. **JSONB 用于存储复杂对象**
4. **为常用查询字段添加索引**
5. **订阅者需在 `createDatabaseConfig` 中注册**
6. **使用 `leftJoinAndSelect` 预加载关联，避免 N+1**

## 参考实现

- `packages/entities/src/event.entity.ts`
- `packages/entities/src/weibo-post.entity.ts`
- `packages/entities/src/weibo-post.subscriber.ts`
