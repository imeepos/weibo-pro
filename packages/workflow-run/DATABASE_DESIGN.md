# 工作流运行数据库表结构设计

## 核心理念
基于现有代码分析,设计最小必要的表结构,每个字段都有明确的存在意义。

---

## 表结构

### 1. workflows (工作流定义表)
工作流模板的持久化存储,记录工作流的静态结构。

```sql
CREATE TABLE workflows (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  -- 工作流图的完整定义(nodes + edges)
  graph_definition JSONB NOT NULL,
  -- 默认输入参数模板
  default_inputs JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_workflows_status ON workflows(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflows_name ON workflows(name) WHERE deleted_at IS NULL;
```

**字段说明:**
- `graph_definition`: 存储 WorkflowGraphAst 的 nodes 和 edges
- `default_inputs`: 工作流级别的默认配置(可被任务覆盖)
- `status`: 工作流的生命周期状态

---

### 2. workflow_schedules (工作流调度表)
定义工作流的执行周期和输入参数。

```sql
CREATE TABLE workflow_schedules (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,

  -- 调度配置
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('once', 'cron', 'interval', 'manual')),
  cron_expression VARCHAR(100),  -- cron 表达式(如: "0 0 * * *")
  interval_seconds INTEGER,       -- 间隔秒数

  -- 运行输入参数(覆盖工作流默认值)
  inputs JSONB NOT NULL DEFAULT '{}',

  -- 调度状态
  status VARCHAR(20) DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled', 'expired')),

  -- 时间范围
  start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMPTZ,

  -- 元信息
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedules_workflow ON workflow_schedules(workflow_id);
CREATE INDEX idx_schedules_next_run ON workflow_schedules(next_run_at, status)
  WHERE status = 'enabled';
CREATE INDEX idx_schedules_status ON workflow_schedules(status);
```

**字段说明:**
- `inputs`: 针对该调度的特定输入,例如 `{"keyword": "人工智能", "startDate": "2025-01-01", "endDate": "2025-01-31"}`
- `schedule_type`:
  - `once`: 一次性执行
  - `cron`: Cron 表达式调度
  - `interval`: 固定时间间隔
  - `manual`: 手动触发
- `next_run_at`: 下次执行时间,由调度器更新

---

### 3. workflow_runs (工作流运行记录表)
记录每次工作流的执行实例及其状态。

```sql
CREATE TABLE workflow_runs (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  schedule_id BIGINT REFERENCES workflow_schedules(id) ON DELETE SET NULL,

  -- 执行状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout')),

  -- 运行时快照
  graph_snapshot JSONB NOT NULL,  -- 执行时的工作流图结构
  inputs JSONB NOT NULL,          -- 本次运行的实际输入参数
  outputs JSONB,                  -- 工作流的输出结果

  -- 执行节点状态追踪
  node_states JSONB DEFAULT '{}', -- { "node_id": { "state": "success", "result": {...}, "error": null } }

  -- 错误追踪
  error JSONB,                    -- { "message": "...", "stack": "...", "node_id": "..." }

  -- 时间追踪
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_runs_workflow ON workflow_runs(workflow_id, created_at DESC);
CREATE INDEX idx_runs_schedule ON workflow_runs(schedule_id, created_at DESC);
CREATE INDEX idx_runs_status ON workflow_runs(status, created_at DESC);
CREATE INDEX idx_runs_created ON workflow_runs(created_at DESC);
```

**字段说明:**
- `graph_snapshot`: 执行时的完整工作流定义,防止后续修改影响历史追溯
- `node_states`: 聚合所有节点的执行状态,避免额外关联查询
- `duration_ms`: 执行耗时,便于性能分析

---

### 4. workflow_run_logs (工作流运行日志表)
可选:详细的执行日志,用于调试和审计。

```sql
CREATE TABLE workflow_run_logs (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,

  -- 日志定位
  node_id VARCHAR(64),           -- 所属节点ID
  level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),

  -- 日志内容
  message TEXT NOT NULL,
  context JSONB,                 -- 额外的上下文信息

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_run ON workflow_run_logs(run_id, created_at);
CREATE INDEX idx_logs_level ON workflow_run_logs(level, created_at) WHERE level IN ('warn', 'error');
```

---

## 使用示例

### 示例 1: 微博关键字搜索工作流

#### 1. 创建工作流
```sql
INSERT INTO workflows (name, graph_definition, default_inputs) VALUES (
  '微博关键字监控',
  '{
    "nodes": [
      {
        "id": "search_node",
        "type": "WeiboKeywordSearchAst",
        "title": "微博检索"
      }
    ],
    "edges": []
  }',
  '{
    "keyword": "",
    "page": 1
  }'
);
```

#### 2. 创建调度任务
```sql
INSERT INTO workflow_schedules (
  workflow_id,
  name,
  schedule_type,
  interval_seconds,
  inputs,
  start_time
) VALUES (
  1,
  '每日监控"人工智能"关键字',
  'interval',
  86400,  -- 24小时
  '{
    "keyword": "人工智能",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-02T00:00:00Z"
  }',
  '2025-01-01T00:00:00Z'
);
```

#### 3. 创建运行记录
```sql
INSERT INTO workflow_runs (
  workflow_id,
  schedule_id,
  status,
  graph_snapshot,
  inputs
) VALUES (
  1,
  1,
  'pending',
  '{ "nodes": [...], "edges": [...] }',
  '{
    "keyword": "人工智能",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-02T00:00:00Z"
  }'
);
```

#### 4. 更新运行状态
```sql
-- 开始执行
UPDATE workflow_runs
SET
  status = 'running',
  started_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- 执行完成
UPDATE workflow_runs
SET
  status = 'success',
  completed_at = CURRENT_TIMESTAMP,
  duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000,
  outputs = '{
    "posts": [...],
    "totalCount": 150
  }',
  node_states = '{
    "search_node": {
      "state": "success",
      "result": { "items": [...] }
    }
  }'
WHERE id = 1;
```

---

## TypeORM 实体参考

基于现有代码风格,对应的实体定义应为:

```typescript
// packages/entities/src/workflow.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum WorkflowStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

@Entity('workflows')
export class WorkflowEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'jsonb', name: 'graph_definition' })
  graphDefinition!: {
    nodes: unknown[];
    edges: unknown[];
  };

  @Column({ type: 'jsonb', name: 'default_inputs', default: {} })
  defaultInputs!: Record<string, unknown>;

  @Index()
  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.ACTIVE,
  })
  status!: WorkflowStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at' })
  deletedAt?: Date;
}

// workflow-schedule.entity.ts
export enum ScheduleType {
  ONCE = 'once',
  CRON = 'cron',
  INTERVAL = 'interval',
  MANUAL = 'manual',
}

export enum ScheduleStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

@Entity('workflow_schedules')
export class WorkflowScheduleEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'bigint', name: 'workflow_id' })
  workflowId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: ScheduleType,
    name: 'schedule_type',
  })
  scheduleType!: ScheduleType;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'cron_expression' })
  cronExpression?: string;

  @Column({ type: 'integer', nullable: true, name: 'interval_seconds' })
  intervalSeconds?: number;

  @Column({ type: 'jsonb', default: {} })
  inputs!: Record<string, unknown>;

  @Index()
  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    default: ScheduleStatus.ENABLED,
  })
  status!: ScheduleStatus;

  @Column({ type: 'timestamptz', name: 'start_time', default: () => 'CURRENT_TIMESTAMP' })
  startTime!: Date;

  @Column({ type: 'timestamptz', name: 'end_time', nullable: true })
  endTime?: Date;

  @Column({ type: 'timestamptz', name: 'last_run_at', nullable: true })
  lastRunAt?: Date;

  @Index()
  @Column({ type: 'timestamptz', name: 'next_run_at', nullable: true })
  nextRunAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

// workflow-run.entity.ts
export enum RunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

@Entity('workflow_runs')
export class WorkflowRunEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'bigint', name: 'workflow_id' })
  workflowId!: number;

  @Index()
  @Column({ type: 'bigint', name: 'schedule_id', nullable: true })
  scheduleId?: number;

  @Index()
  @Column({
    type: 'enum',
    enum: RunStatus,
    default: RunStatus.PENDING,
  })
  status!: RunStatus;

  @Column({ type: 'jsonb', name: 'graph_snapshot' })
  graphSnapshot!: unknown;

  @Column({ type: 'jsonb' })
  inputs!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  outputs?: Record<string, unknown>;

  @Column({ type: 'jsonb', name: 'node_states', default: {} })
  nodeStates!: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  error?: {
    message: string;
    stack?: string;
    nodeId?: string;
  };

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ type: 'integer', name: 'duration_ms', nullable: true })
  durationMs?: number;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

// workflow-run-log.entity.ts
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

@Entity('workflow_run_logs')
export class WorkflowRunLogEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Index()
  @Column({ type: 'bigint', name: 'run_id' })
  runId!: number;

  @Column({ type: 'varchar', length: 64, name: 'node_id', nullable: true })
  nodeId?: string;

  @Index()
  @Column({ type: 'enum', enum: LogLevel })
  level!: LogLevel;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, unknown>;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
```

---

## 设计原则

### 1. 存在即合理
- **workflows**: 存储工作流定义,复用性的核心
- **workflow_schedules**: 调度策略与输入参数的分离,一个工作流可有多个调度
- **workflow_runs**: 每次执行的完整记录,可追溯可审计
- **workflow_run_logs**: 可选的详细日志,按需启用

### 2. 优雅即简约
- 使用 JSONB 存储复杂结构,避免过度规范化
- 索引仅覆盖高频查询路径
- 通过 `graph_snapshot` 避免历史数据失真

### 3. 性能即艺术
- `node_states` 在 `workflow_runs` 中聚合,减少 JOIN
- 分区索引(`WHERE` 条件)优化热数据查询
- `next_run_at` 索引支持调度器高效轮询

### 4. 错误处理哲学
- `status` 枚举覆盖所有执行状态
- `error` 字段记录失败节点和堆栈
- 日志表独立,避免影响核心表性能

---

## 查询示例

### 1. 获取待执行的调度任务
```sql
SELECT * FROM workflow_schedules
WHERE status = 'enabled'
  AND next_run_at <= CURRENT_TIMESTAMP
  AND (end_time IS NULL OR end_time > CURRENT_TIMESTAMP)
ORDER BY next_run_at
LIMIT 100;
```

### 2. 获取工作流的最近运行记录
```sql
SELECT * FROM workflow_runs
WHERE workflow_id = 1
ORDER BY created_at DESC
LIMIT 10;
```

### 3. 统计工作流成功率
```sql
SELECT
  workflow_id,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM workflow_runs
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY workflow_id;
```

### 4. 查找失败的运行及错误信息
```sql
SELECT
  r.id,
  r.workflow_id,
  w.name,
  r.status,
  r.error,
  r.created_at
FROM workflow_runs r
JOIN workflows w ON r.workflow_id = w.id
WHERE r.status = 'failed'
  AND r.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY r.created_at DESC;
```

---

## 扩展建议

### 可选增强(按需添加)
1. **用户关联**: 如需多租户,在 workflows 和 schedules 添加 `user_id`
2. **通知机制**: 添加 `workflow_notifications` 表记录执行结果通知配置
3. **重试策略**: 在 schedules 添加 `retry_policy` JSONB 字段
4. **并发控制**: 在 workflows 添加 `max_concurrent_runs` 字段

### 注意事项
- JSONB 字段应避免过深嵌套(建议 ≤ 3 层)
- 定期归档旧的 `workflow_runs` 和 `logs` 数据
- 考虑对大结果使用对象存储(S3/OSS),表中仅存引用

---

**设计完成时间**: 2025-01-04
**版本**: 1.0
