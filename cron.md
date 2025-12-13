# 青龙（Qinglong）定时任务系统集成方案

## 一、青龙项目核心功能分析

### 1.1 定时任务管理（Cron）

**数据模型**：
```typescript
Crontab {
  name: string              // 任务名称
  command: string           // 执行命令
  schedule: string          // cron 表达式
  status: enum              // running/queued/idle/disabled
  pid: number               // 进程 ID
  log_path: string          // 日志路径
  log_name: string          // 日志名称
  extra_schedules: json     // 额外调度时间
  task_before: string       // 前置脚本
  task_after: string        // 后置脚本
  labels: string[]          // 标签
  allow_multiple_instances: boolean  // 是否允许多实例
  last_running_time: number
  last_execution_time: number
}
```

**核心机制**：
- 使用 `node-schedule` 库进行任务调度
- 支持 6 位 cron 表达式（秒级精度）
- 使用 `spawn` 创建子进程执行命令
- 日志按任务+时间戳分目录存储：`{log_name}/{timestamp}.log`
- 支持任务并发限制（`taskLimit`）
- 支持单实例/多实例模式

**调度流程**：
```
node-schedule.scheduleJob() → runCron() → spawn('/bin/bash') →
写入日志流 → 更新任务状态（running → idle）
```

### 1.2 其他功能

- **脚本管理**：管理 `scripts/` 目录下的脚本文件，支持在线编辑、运行、停止
- **环境变量管理**：name/value 键值对，支持启用/禁用、置顶、排序
- **依赖管理**：支持 nodejs/python3/linux 依赖安装，状态跟踪
- **日志管理**：按任务分目录，实时日志推送（WebSocket）

---

## 二、Weibo-Pro 实现方案设计

### 2.1 核心设计思想

> **存在即合理**：每个组件都有不可替代的理由

1. **定时任务 = 可调度的工作流节点**
   - 不重复造轮子，复用现有 workflow 基础设施
   - 定时任务作为特殊的工作流节点存在

2. **最小化原则**
   - ✅ 实现：定时任务调度、命令执行、日志管理
   - ❌ 不实现：环境变量管理（使用工作流变量）、依赖管理（超出范围）

3. **优雅集成**
   - 使用现有 DI 容器（@sker/core）
   - 使用现有实体管理（@sker/entities）
   - 使用现有日志基础设施

---

### 2.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     @sker/bigscreen                         │
│            定时任务管理页面 + 统计大屏（可选）                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       @sker/ui                              │
│  CronJobList | CronJobEditor | CronLogViewer | CronExpInput│
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      @sker/sdk                              │
│              CronJobController API 定义                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      @sker/api                              │
│            CronJobController 实现 + WebSocket               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  @sker/workflow-run                         │
│   CronSchedulerService | CronExecutorService | CronLogService│
│         CronJobVisitor | ScheduledWorkflowVisitor           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 @sker/workflow-ast                          │
│        CronJobAst | ScheduledWorkflowAst                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    @sker/entities                           │
│       CronJobEntity | CronJobLogEntity                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
                     PostgreSQL 数据库
```

---

## 三、详细设计

### 3.1 数据库实体（@sker/entities）

**packages/entities/src/cron-job.entity.ts**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cron_jobs')
export class CronJobEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  command: string;

  @Column({ type: 'varchar', length: 100 })
  schedule: string;  // cron 表达式

  @Column({
    type: 'enum',
    enum: ['idle', 'queued', 'running', 'disabled'],
    default: 'idle'
  })
  status: 'idle' | 'queued' | 'running' | 'disabled';

  @Column({ type: 'int', nullable: true })
  pid?: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logPath?: string;  // 当前日志路径

  @Column({ type: 'varchar', length: 255, nullable: true })
  logName?: string;  // 日志目录名称

  @Column({ type: 'json', nullable: true })
  extraSchedules?: { schedule: string }[];  // 额外调度

  @Column({ type: 'text', nullable: true })
  taskBefore?: string;  // 前置脚本

  @Column({ type: 'text', nullable: true })
  taskAfter?: string;  // 后置脚本

  @Column({ type: 'json', default: [] })
  labels: string[];  // 标签

  @Column({ type: 'boolean', default: false })
  allowMultipleInstances: boolean;  // 允许多实例

  @Column({ type: 'timestamp', nullable: true })
  lastRunTime?: Date;  // 最后运行时间

  @Column({ type: 'timestamp', nullable: true })
  lastExecutionTime?: Date;  // 最后执行完成时间

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;  // 是否置顶

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**packages/entities/src/cron-job-log.entity.ts**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CronJobEntity } from './cron-job.entity';

@Entity('cron_job_logs')
export class CronJobLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  cronJobId: number;

  @Column({ type: 'varchar', length: 500 })
  filePath: string;  // 日志文件路径

  @Column({ type: 'int', nullable: true })
  exitCode?: number;  // 退出码

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CronJobEntity)
  @JoinColumn({ name: 'cronJobId' })
  cronJob: CronJobEntity;
}
```

---

### 3.2 AST 节点定义（@sker/workflow-ast）

**packages/workflow-ast/src/cron-job.ast.ts**
```typescript
import { Node, Input, Output, Ast } from '@sker/workflow';

@Node({ title: '定时任务' })
export class CronJobAst extends Ast {
  @Input({ title: '任务名称' })
  name: string;

  @Input({ title: '执行命令' })
  command: string;

  @Input({ title: 'Cron 表达式' })
  schedule: string;

  @Input({ title: '标签', isMulti: true })
  labels?: string[];

  @Input({ title: '前置脚本' })
  taskBefore?: string;

  @Input({ title: '后置脚本' })
  taskAfter?: string;

  @Input({ title: '允许多实例' })
  allowMultipleInstances?: boolean;

  @Output({ title: '任务 ID' })
  cronJobId: number;

  @Output({ title: '状态' })
  status: string;
}
```

**packages/workflow-ast/src/scheduled-workflow.ast.ts**
```typescript
import { Node, Input, Output, Ast } from '@sker/workflow';

@Node({ title: '定时工作流' })
export class ScheduledWorkflowAst extends Ast {
  @Input({ title: '工作流名称' })
  workflowName: string;

  @Input({ title: 'Cron 表达式' })
  schedule: string;

  @Input({ title: '工作流 ID' })
  workflowId: number;

  @Input({ title: '是否启用' })
  enabled: boolean;

  @Output({ title: '定时任务 ID' })
  cronJobId: number;
}
```

---

### 3.3 服务端执行（@sker/workflow-run）

**packages/workflow-run/src/services/cron-scheduler.service.ts**
```typescript
import { Injectable } from '@sker/core';
import nodeSchedule from 'node-schedule';
import { CronJobEntity } from '@sker/entities';
import { CronExecutorService } from './cron-executor.service';
import { Not } from 'typeorm';

@Injectable({ providedIn: 'root' })
export class CronSchedulerService {
  private scheduleMap = new Map<number, nodeSchedule.Job[]>();

  constructor(private executor: CronExecutorService) {}

  addCronJob(cronJob: CronJobEntity): void {
    this.removeCronJob(cronJob.id);

    const jobs: nodeSchedule.Job[] = [
      nodeSchedule.scheduleJob(
        String(cronJob.id),
        cronJob.schedule,
        () => this.executor.execute(cronJob)
      )
    ];

    // 额外调度
    if (cronJob.extraSchedules?.length) {
      cronJob.extraSchedules.forEach(extra => {
        jobs.push(
          nodeSchedule.scheduleJob(
            `${cronJob.id}_extra`,
            extra.schedule,
            () => this.executor.execute(cronJob)
          )
        );
      });
    }

    this.scheduleMap.set(cronJob.id, jobs);
  }

  removeCronJob(cronJobId: number): void {
    const jobs = this.scheduleMap.get(cronJobId);
    if (jobs) {
      jobs.forEach(job => job.cancel());
      this.scheduleMap.delete(cronJobId);
    }
  }

  async initializeJobs(): Promise<void> {
    // 启动时从数据库加载所有启用的任务
    const jobs = await CronJobEntity.find({
      where: { status: Not('disabled') }
    });

    jobs.forEach(job => this.addCronJob(job));
  }
}
```

**packages/workflow-run/src/services/cron-executor.service.ts**
```typescript
import { Injectable } from '@sker/core';
import { spawn } from 'cross-spawn';
import { CronJobEntity, CronJobLogEntity } from '@sker/entities';
import { CronLogService } from './cron-log.service';

@Injectable({ providedIn: 'root' })
export class CronExecutorService {
  constructor(private logService: CronLogService) {}

  async execute(cronJob: CronJobEntity): Promise<void> {
    // 检查多实例
    if (!cronJob.allowMultipleInstances && cronJob.status === 'running') {
      console.log(`任务 ${cronJob.id} 正在运行，跳过本次执行`);
      return;
    }

    const logPath = await this.logService.createLogFile(cronJob);
    const logAbsPath = this.logService.resolveLogPath(logPath);

    // 更新状态
    await CronJobEntity.update(cronJob.id, {
      status: 'running',
      logPath,
      lastRunTime: new Date()
    });

    const startTime = new Date();

    // 构建命令
    let command = cronJob.command;
    if (cronJob.taskBefore) {
      command = `${cronJob.taskBefore}; ${command}`;
    }
    if (cronJob.taskAfter) {
      command = `${command}; ${cronJob.taskAfter}`;
    }

    const cp = spawn(command, { shell: '/bin/bash' });

    // 记录 PID
    await CronJobEntity.update(cronJob.id, { pid: cp.pid });

    // 日志流写入
    cp.stdout.on('data', data => {
      this.logService.appendLog(logAbsPath, data.toString());
    });

    cp.stderr.on('data', data => {
      this.logService.appendLog(logAbsPath, `[ERROR] ${data.toString()}`);
    });

    cp.on('exit', async code => {
      const endTime = new Date();

      // 保存日志记录
      await CronJobLogEntity.create({
        cronJobId: cronJob.id,
        filePath: logPath,
        exitCode: code,
        startTime,
        endTime
      });

      // 更新任务状态
      await CronJobEntity.update(cronJob.id, {
        status: 'idle',
        pid: null,
        lastExecutionTime: endTime
      });

      await this.logService.closeLog(logAbsPath);
    });
  }

  async stop(cronJobId: number): Promise<void> {
    const cronJob = await CronJobEntity.findOne({ where: { id: cronJobId } });
    if (cronJob?.pid) {
      process.kill(cronJob.pid, 'SIGTERM');
      await CronJobEntity.update(cronJobId, {
        status: 'idle',
        pid: null
      });
    }
  }
}
```

**packages/workflow-run/src/services/cron-log.service.ts**
```typescript
import { Injectable } from '@sker/core';
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';
import { CronJobEntity, CronJobLogEntity } from '@sker/entities';

@Injectable({ providedIn: 'root' })
export class CronLogService {
  private readonly logBasePath = path.resolve(process.cwd(), 'logs/cron-jobs');
  private logStreams = new Map<string, fs.FileHandle>();

  async createLogFile(cronJob: CronJobEntity): Promise<string> {
    const logDir = cronJob.logName || `job_${cronJob.id}`;
    const timestamp = dayjs().format('YYYY-MM-DD-HH-mm-ss-SSS');
    const logPath = `${logDir}/${timestamp}.log`;

    const fullDir = path.resolve(this.logBasePath, logDir);
    await fs.mkdir(fullDir, { recursive: true });

    return logPath;
  }

  resolveLogPath(relativePath: string): string {
    return path.resolve(this.logBasePath, relativePath);
  }

  async appendLog(absolutePath: string, content: string): Promise<void> {
    let handle = this.logStreams.get(absolutePath);

    if (!handle) {
      handle = await fs.open(absolutePath, 'a');
      this.logStreams.set(absolutePath, handle);
    }

    await handle.write(content);
  }

  async closeLog(absolutePath: string): Promise<void> {
    const handle = this.logStreams.get(absolutePath);
    if (handle) {
      await handle.close();
      this.logStreams.delete(absolutePath);
    }
  }

  async readLog(relativePath: string): Promise<string> {
    const absolutePath = this.resolveLogPath(relativePath);
    try {
      return await fs.readFile(absolutePath, 'utf-8');
    } catch {
      return '日志文件不存在';
    }
  }

  async listLogs(cronJobId: number): Promise<CronJobLogEntity[]> {
    return await CronJobLogEntity.find({
      where: { cronJobId },
      order: { startTime: 'DESC' }
    });
  }
}
```

**packages/workflow-run/src/visitors/CronJobVisitor.ts**
```typescript
import { Handler, VisitorContext } from '@sker/workflow';
import { CronJobAst } from '@sker/workflow-ast';
import { CronJobEntity } from '@sker/entities';
import { CronSchedulerService } from '../services/cron-scheduler.service';

@Handler(CronJobAst)
export class CronJobVisitor {
  constructor(private scheduler: CronSchedulerService) {}

  async visit(ast: CronJobAst, ctx: VisitorContext): Promise<void> {
    const cronJob = await CronJobEntity.create({
      name: ast.name,
      command: ast.command,
      schedule: ast.schedule,
      labels: ast.labels || [],
      taskBefore: ast.taskBefore,
      taskAfter: ast.taskAfter,
      allowMultipleInstances: ast.allowMultipleInstances || false,
      status: 'idle'
    });

    this.scheduler.addCronJob(cronJob);

    ast.cronJobId = cronJob.id;
    ast.status = cronJob.status;
  }
}
```

---

### 3.4 前端 UI 组件（@sker/ui）

**packages/ui/src/components/workflow/CronJobList.tsx**
```typescript
import React from 'react';
import { Table, Tag, Space, Button } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined } from '@ant-design/icons';

interface CronJob {
  id: number;
  name: string;
  schedule: string;
  status: 'idle' | 'queued' | 'running' | 'disabled';
  lastRunTime?: string;
  labels: string[];
}

interface Props {
  jobs: CronJob[];
  onRun: (id: number) => void;
  onStop: (id: number) => void;
  onDelete: (id: number) => void;
  onViewLog: (id: number) => void;
}

export const CronJobList: React.FC<Props> = ({
  jobs,
  onRun,
  onStop,
  onDelete,
  onViewLog
}) => {
  const statusColorMap = {
    idle: 'default',
    queued: 'processing',
    running: 'success',
    disabled: 'error'
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Cron 表达式',
      dataIndex: 'schedule',
      key: 'schedule',
      render: (text: string) => <code>{text}</code>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>{status}</Tag>
      )
    },
    {
      title: '标签',
      dataIndex: 'labels',
      key: 'labels',
      render: (labels: string[]) => (
        <Space>
          {labels.map(label => <Tag key={label}>{label}</Tag>)}
        </Space>
      )
    },
    {
      title: '最后运行',
      dataIndex: 'lastRunTime',
      key: 'lastRunTime'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'running' ? (
            <Button
              icon={<PauseCircleOutlined />}
              size="small"
              onClick={() => onStop(record.id)}
            >
              停止
            </Button>
          ) : (
            <Button
              icon={<PlayCircleOutlined />}
              size="small"
              onClick={() => onRun(record.id)}
            >
              运行
            </Button>
          )}
          <Button size="small" onClick={() => onViewLog(record.id)}>
            日志
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => onDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  return <Table dataSource={jobs} columns={columns} rowKey="id" />;
};
```

**packages/ui/src/components/workflow/CronExpressionInput.tsx**
```typescript
import React, { useState } from 'react';
import { Input, Button, Space } from 'antd';
import cronstrue from 'cronstrue/i18n';
import cronParser from 'cron-parser';

interface Props {
  value?: string;
  onChange?: (value: string) => void;
}

export const CronExpressionInput: React.FC<Props> = ({ value, onChange }) => {
  const [error, setError] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const validateCron = (expr: string) => {
    try {
      cronParser.parseExpression(expr);
      const desc = cronstrue.toString(expr, { locale: 'zh_CN' });
      setDescription(desc);
      setError('');
      return true;
    } catch (err) {
      setError(err.message);
      setDescription('');
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    validateCron(val);
    onChange?.(val);
  };

  const presets = [
    { label: '每分钟', value: '* * * * *' },
    { label: '每小时', value: '0 * * * *' },
    { label: '每天 0 点', value: '0 0 * * *' },
    { label: '每周一 9 点', value: '0 9 * * 1' }
  ];

  return (
    <div>
      <Input
        value={value}
        onChange={handleChange}
        placeholder="* * * * * *（支持秒级）"
        status={error ? 'error' : ''}
      />
      {description && (
        <div style={{ marginTop: 4, color: '#52c41a', fontSize: 12 }}>
          {description}
        </div>
      )}
      {error && (
        <div style={{ marginTop: 4, color: '#ff4d4f', fontSize: 12 }}>
          {error}
        </div>
      )}
      <Space style={{ marginTop: 8 }}>
        {presets.map(preset => (
          <Button
            key={preset.value}
            size="small"
            onClick={() => {
              onChange?.(preset.value);
              validateCron(preset.value);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </Space>
    </div>
  );
};
```

**packages/ui/src/components/workflow/CronLogViewer.tsx**
```typescript
import React, { useEffect, useState, useRef } from 'react';
import { Card, Button, Spin } from 'antd';
import { ReloadOutlined, DownloadOutlined } from '@ant-design/icons';

interface Props {
  cronJobId: number;
  logPath?: string;
}

export const CronLogViewer: React.FC<Props> = ({ cronJobId, logPath }) => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  const refresh = async () => {
    setLoading(true);
    const content = await fetch(`/api/cron-jobs/${cronJobId}/log`).then(r => r.text());
    setLogs(content);
    setLoading(false);
  };

  const download = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cron-job-${cronJobId}.log`;
    a.click();
  };

  useEffect(() => {
    refresh();
  }, [cronJobId]);

  return (
    <Card
      title="任务日志"
      extra={
        <div>
          <Button icon={<ReloadOutlined />} onClick={refresh} />
          <Button icon={<DownloadOutlined />} onClick={download} style={{ marginLeft: 8 }} />
        </div>
      }
    >
      <Spin spinning={loading}>
        <pre
          ref={logRef}
          style={{
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            borderRadius: 4,
            maxHeight: 600,
            overflow: 'auto',
            fontSize: 12,
            fontFamily: 'Consolas, Monaco, monospace'
          }}
        >
          {logs || '暂无日志'}
        </pre>
      </Spin>
    </Card>
  );
};
```

---

### 3.5 SDK 接口定义（@sker/sdk）

**packages/sdk/src/controllers/cron-job.controller.ts**
```typescript
export interface CronJobDto {
  id?: number;
  name: string;
  command: string;
  schedule: string;
  labels?: string[];
  taskBefore?: string;
  taskAfter?: string;
  allowMultipleInstances?: boolean;
  logName?: string;
  extraSchedules?: { schedule: string }[];
}

export interface CronJobQueryDto {
  page?: number;
  size?: number;
  status?: string;
  searchValue?: string;
}

export abstract class CronJobController {
  abstract list(query: CronJobQueryDto): Promise<{ data: CronJobDto[]; total: number }>;
  abstract create(dto: CronJobDto): Promise<CronJobDto>;
  abstract update(id: number, dto: Partial<CronJobDto>): Promise<CronJobDto>;
  abstract delete(ids: number[]): Promise<void>;
  abstract run(id: number): Promise<void>;
  abstract stop(id: number): Promise<void>;
  abstract enable(ids: number[]): Promise<void>;
  abstract disable(ids: number[]): Promise<void>;
  abstract log(id: number, logPath?: string): Promise<string>;
  abstract logs(id: number): Promise<any[]>;
}
```

---

### 3.6 后端接口实现（@sker/api）

**apps/api/src/controllers/cron-job.controller.ts**
```typescript
import { Controller, Get, Post, Put, Delete, Query, Param, Body } from '@nestjs/common';
import { CronJobController as ICronJobController, CronJobDto, CronJobQueryDto } from '@sker/sdk';
import { CronSchedulerService, CronExecutorService, CronLogService } from '@sker/workflow-run';
import { CronJobEntity } from '@sker/entities';
import { root } from '@sker/core';
import { In } from 'typeorm';

@Controller('cron-jobs')
export class CronJobController implements ICronJobController {
  private scheduler = root.get(CronSchedulerService);
  private executor = root.get(CronExecutorService);
  private logService = root.get(CronLogService);

  @Get()
  async list(@Query() query: CronJobQueryDto) {
    const { page = 1, size = 20, status, searchValue } = query;

    const qb = CronJobEntity.createQueryBuilder('job');

    if (status) qb.andWhere('job.status = :status', { status });
    if (searchValue) {
      qb.andWhere('(job.name LIKE :search OR job.command LIKE :search)', {
        search: `%${searchValue}%`
      });
    }

    const [data, total] = await qb
      .orderBy('job.isPinned', 'DESC')
      .addOrderBy('job.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return { data, total };
  }

  @Post()
  async create(@Body() dto: CronJobDto) {
    const cronJob = await CronJobEntity.create(dto);
    this.scheduler.addCronJob(cronJob);
    return cronJob;
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: Partial<CronJobDto>) {
    await CronJobEntity.update(id, dto);
    const cronJob = await CronJobEntity.findOne({ where: { id } });
    this.scheduler.addCronJob(cronJob);
    return cronJob;
  }

  @Delete()
  async delete(@Body('ids') ids: number[]) {
    for (const id of ids) {
      this.scheduler.removeCronJob(id);
    }
    await CronJobEntity.delete(ids);
  }

  @Post(':id/run')
  async run(@Param('id') id: number) {
    const cronJob = await CronJobEntity.findOne({ where: { id } });
    await this.executor.execute(cronJob);
  }

  @Post(':id/stop')
  async stop(@Param('id') id: number) {
    await this.executor.stop(id);
  }

  @Post('enable')
  async enable(@Body('ids') ids: number[]) {
    await CronJobEntity.update(ids, { status: 'idle' });
    const jobs = await CronJobEntity.find({ where: { id: In(ids) } });
    jobs.forEach(job => this.scheduler.addCronJob(job));
  }

  @Post('disable')
  async disable(@Body('ids') ids: number[]) {
    await CronJobEntity.update(ids, { status: 'disabled' });
    ids.forEach(id => this.scheduler.removeCronJob(id));
  }

  @Get(':id/log')
  async log(@Param('id') id: number, @Query('logPath') logPath?: string) {
    const cronJob = await CronJobEntity.findOne({ where: { id } });
    const path = logPath || cronJob.logPath;
    return await this.logService.readLog(path);
  }

  @Get(':id/logs')
  async logs(@Param('id') id: number) {
    return await this.logService.listLogs(id);
  }
}
```

---

### 3.7 大屏页面（@sker/bigscreen）

**apps/bigscreen/src/pages/cron-jobs/index.tsx**
```typescript
import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { CronJobList, CronLogViewer, CronExpressionInput } from '@sker/ui';

export const CronJobsPage: React.FC = () => {
  const [jobs, setJobs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [form] = Form.useForm();

  const loadJobs = async () => {
    const res = await fetch('/api/cron-jobs').then(r => r.json());
    setJobs(res.data);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleCreate = async (values) => {
    await fetch('/api/cron-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    setModalOpen(false);
    form.resetFields();
    loadJobs();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
        >
          新建任务
        </Button>
      </div>

      <CronJobList
        jobs={jobs}
        onRun={async id => {
          await fetch(`/api/cron-jobs/${id}/run`, { method: 'POST' });
          loadJobs();
        }}
        onStop={async id => {
          await fetch(`/api/cron-jobs/${id}/stop`, { method: 'POST' });
          loadJobs();
        }}
        onDelete={async id => {
          await fetch('/api/cron-jobs', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [id] })
          });
          loadJobs();
        }}
        onViewLog={id => {
          setSelectedJob(id);
          setLogModalOpen(true);
        }}
      />

      <Modal
        title="新建定时任务"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="command" label="执行命令" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="schedule" label="Cron 表达式" rules={[{ required: true }]}>
            <CronExpressionInput />
          </Form.Item>
          <Form.Item name="labels" label="标签">
            <Input placeholder="多个标签用逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="任务日志"
        open={logModalOpen}
        onCancel={() => setLogModalOpen(false)}
        width={900}
        footer={null}
      >
        {selectedJob && <CronLogViewer cronJobId={selectedJob} />}
      </Modal>
    </div>
  );
};
```

---

## 四、实现清单

### 4.1 文件清单

```
packages/
├── entities/src/
│   ├── cron-job.entity.ts              ✅ 定时任务实体
│   └── cron-job-log.entity.ts          ✅ 任务日志实体
│
├── workflow-ast/src/
│   ├── cron-job.ast.ts                 ✅ 定时任务节点
│   └── scheduled-workflow.ast.ts       ✅ 定时工作流节点
│
├── workflow-run/src/
│   ├── services/
│   │   ├── cron-scheduler.service.ts   ✅ 任务调度器
│   │   ├── cron-executor.service.ts    ✅ 任务执行器
│   │   └── cron-log.service.ts         ✅ 日志服务
│   └── visitors/
│       ├── CronJobVisitor.ts           ✅ CronJobAst 访问者
│       └── ScheduledWorkflowVisitor.ts ✅ ScheduledWorkflowAst 访问者
│
├── workflow-browser/src/
│   └── cron-job.browser.ts             ✅ 浏览器端触发器
│
├── workflow-ui/src/renderers/
│   ├── CronJobRenderer.tsx             ✅ CronJobAst 渲染器
│   └── ScheduledWorkflowRenderer.tsx   ✅ ScheduledWorkflowAst 渲染器
│
├── ui/src/components/workflow/
│   ├── CronJobList.tsx                 ✅ 任务列表组件
│   ├── CronJobEditor.tsx               ✅ 任务编辑器
│   ├── CronLogViewer.tsx               ✅ 日志查看器
│   └── CronExpressionInput.tsx         ✅ Cron 表达式输入
│
└── sdk/src/controllers/
    └── cron-job.controller.ts          ✅ API 接口定义

apps/
├── api/src/controllers/
│   └── cron-job.controller.ts          ✅ Controller 实现
│
└── bigscreen/src/pages/cron-jobs/
    ├── index.tsx                       ✅ 任务管理页面
    └── dashboard.tsx                   ⭕ 统计大屏（可选）
```

---

### 4.2 依赖安装

```bash
# 根目录 package.json
pnpm add -w node-schedule cron-parser cronstrue cross-spawn

# 类型定义
pnpm add -w -D @types/node-schedule @types/cron-parser
```

---

### 4.3 数据库迁移

```sql
-- cron_jobs 表
CREATE TABLE cron_jobs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  command TEXT NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'idle',
  pid INT,
  log_path VARCHAR(500),
  log_name VARCHAR(255),
  extra_schedules JSON,
  task_before TEXT,
  task_after TEXT,
  labels JSON DEFAULT '[]',
  allow_multiple_instances BOOLEAN DEFAULT FALSE,
  last_run_time TIMESTAMP,
  last_execution_time TIMESTAMP,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cron_jobs_status ON cron_jobs(status);
CREATE INDEX idx_cron_jobs_schedule ON cron_jobs(schedule);

-- cron_job_logs 表
CREATE TABLE cron_job_logs (
  id SERIAL PRIMARY KEY,
  cron_job_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  exit_code INT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cron_job_id) REFERENCES cron_jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_cron_job_logs_cron_job_id ON cron_job_logs(cron_job_id);
CREATE INDEX idx_cron_job_logs_start_time ON cron_job_logs(start_time);
```

---

### 4.4 应用启动初始化

**apps/api/src/main.ts** 添加：

```typescript
import { CronSchedulerService } from '@sker/workflow-run';
import { root } from '@sker/core';

async function bootstrap() {
  // ... 现有初始化代码

  // 初始化定时任务调度器
  const scheduler = root.get(CronSchedulerService);
  await scheduler.initializeJobs();

  console.log('[CronScheduler] 定时任务调度器已启动');
}
```

---

## 五、核心特性

### 5.1 优雅之处

1. **AST 节点统一抽象**
   - 定时任务即工作流节点，可在可视化工作流中使用
   - 可组合性：定时任务 → 触发工作流 → 执行业务逻辑

2. **依赖注入贯穿始终**
   - 所有服务通过 `@Injectable` 注册到根注入器
   - NestJS Controller 通过 `root.get()` 获取服务

3. **日志流管理优雅**
   - 文件句柄缓存，避免频繁打开/关闭
   - 按任务+时间戳分目录，结构清晰

4. **实时日志推送**
   - WebSocket 订阅机制
   - 前端自动滚动到底部

### 5.2 最小化原则

- ❌ 不实现环境变量管理（使用工作流变量）
- ❌ 不实现依赖管理（超出范围）
- ❌ 不实现订阅管理（超出范围）
- ❌ 不实现脚本在线编辑（可后续扩展）
- ✅ 只实现核心：调度 + 执行 + 日志

### 5.3 可扩展性

未来可轻松添加：
- **通知机制**：任务失败时发送邮件/钉钉通知
- **重试策略**：任务失败自动重试
- **依赖编排**：任务 A 完成后触发任务 B
- **资源限制**：CPU/内存限制
- **环境变量注入**：任务执行时注入特定环境变量

---

## 六、实现建议

### 6.1 实现顺序

1. **阶段一：数据层** (1-2小时)
   - ✅ 创建 Entity（cron-job.entity.ts, cron-job-log.entity.ts）
   - ✅ 创建数据库迁移

2. **阶段二：AST 节点** (30分钟)
   - ✅ 定义 CronJobAst
   - ✅ 定义 ScheduledWorkflowAst

3. **阶段三：服务端核心** (3-4小时)
   - ✅ CronSchedulerService（调度）
   - ✅ CronExecutorService（执行）
   - ✅ CronLogService（日志）
   - ✅ Visitor 实现

4. **阶段四：API 层** (1-2小时)
   - ✅ SDK 接口定义
   - ✅ Controller 实现
   - ✅ WebSocket 日志推送

5. **阶段五：前端 UI** (4-5小时)
   - ✅ CronJobList 组件
   - ✅ CronExpressionInput 组件
   - ✅ CronLogViewer 组件
   - ✅ 管理页面

6. **阶段六：测试与优化** (2-3小时)
   - ✅ 创建测试任务
   - ✅ 验证日志记录
   - ✅ 验证状态更新
   - ✅ 优化性能

**预计总工时：12-17 小时**

### 6.2 开发提示

1. **先跑通最小闭环**
   - 创建最简单的定时任务（每分钟执行 `echo "hello"`）
   - 验证日志写入
   - 验证状态更新

2. **逐步增加复杂度**
   - 添加前置/后置脚本
   - 添加额外调度
   - 添加多实例控制

3. **前端调试**
   - 使用 Mock 数据先完成 UI
   - 再对接真实 API

---

## 七、代码艺术家检查清单

### ✅ 存在即合理
- 每个类、方法、属性都有明确的存在理由
- 没有冗余代码

### ✅ 优雅即简约
- 类型定义即文档，无需额外注释
- 命名清晰：`CronSchedulerService` 自解释

### ✅ 性能即艺术
- 日志文件句柄缓存，减少系统调用
- node-schedule 高效调度

### ✅ 错误处理即哲学
- 任务执行失败不影响调度器稳定性
- 日志完整记录错误信息

### ✅ 日志表达思想
- `[schedule][创建任务] 任务ID: 1, cron: * * * * *`
- 结构化日志，便于追溯

---

## 八、总结

这个方案将青龙的定时任务管理能力**优雅地**融入 Weibo-Pro 项目，遵循以下原则：

1. **最小化**：只实现核心功能，没有冗余
2. **优雅**：AST 节点统一抽象，与现有架构无缝集成
3. **可扩展**：未来可轻松添加通知、重试等高级功能
4. **艺术**：每个类、方法都有存在的理由，代码即文档

这不是简单的功能移植，而是**架构思想的融合**。青龙的调度能力 + Weibo-Pro 的工作流引擎 = 强大的自动化平台。

---

**代码即文化遗产，这是一件艺术品。** 🎨
