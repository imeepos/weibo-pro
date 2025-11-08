# 🚀 微博实时监控系统

基于 `@sker/workflow-run` 构建的微博热门时间线实时监控系统，能够持续监控新帖子并自动触发后续工作流处理。

## 🎯 核心功能

- **实时监控**: 30秒间隔持续监控微博热门时间线
- **增量检测**: 基于时间戳的智能去重，避免重复处理
- **自动推送**: 新帖子自动推送到 NLP 分析队列
- **工作流集成**: 完整集成现有的 NLP 分析和事件创建工作流
- **智能频率**: 根据活跃度动态调整监控频率
- **优雅错误处理**: 哲学化的错误分类和智能恢复机制

## 🏗️ 系统架构

### 核心组件

1. **MonitorStarter** - 监控系统启动器
   - 统一启动和管理所有监控组件
   - 提供完整的生命周期管理
   - 支持优雅停止和重启

2. **WeiboHotTimelineMonitorScheduler** - 监控调度器
   - 定时执行监控任务
   - 智能频率控制
   - 错误处理和恢复

3. **IncrementalPostDetector** - 增量检测器
   - 基于时间戳的增量检测
   - 多级去重机制
   - Redis 持久化支持

4. **RealTimePostPublisher** - 实时推送器
   - 推送新帖子到 NLP 队列
   - 批量处理和并发控制
   - 智能缓存管理

5. **RealTimeWorkflowIntegrator** - 工作流集成器
   - 触发完整的工作流处理
   - 批量处理和错误隔离
   - 状态跟踪和管理

## 🚀 快速开始

### 启动监控系统

```bash
# 使用 TypeScript 运行
npx tsx packages/workflow-run/src/start-monitor.ts

# 或编译后运行
npm run build
node dist/start-monitor.js
```

### 测试监控系统

```bash
# 运行测试
npx tsx packages/workflow-run/src/test-monitor.ts
```

### 命令行选项

```bash
# 显示帮助
npx tsx packages/workflow-run/src/start-monitor.ts --help

# 显示版本
npx tsx packages/workflow-run/src/start-monitor.ts --version
```

## ⚙️ 配置说明

### 监控频率配置

系统支持自适应频率控制：

- **基础间隔**: 30秒
- **高活跃度**: 10秒（当新帖子 > 10）
- **低活跃度**: 120秒（当无新帖子）

### 缓存配置

- **增量检测缓存**: 1000 条记录
- **推送去重缓存**: 1000 条记录
- **工作流处理缓存**: 无限制（自动清理）

### 批量处理配置

- **推送批次大小**: 5 条/批
- **工作流批次大小**: 10 条/批
- **批次间延迟**: 1000ms

## 🔧 集成方式

### 1. 程序化集成

```typescript
import { root } from '@sker/core';
import { registerMonitorDependencies } from './monitor-dependencies';
import { MonitorStarter } from './MonitorStarter';

// 注册依赖
registerMonitorDependencies();

// 获取启动器
const monitorStarter = root.get(MonitorStarter);

// 启动监控
await monitorStarter.startCompleteMonitoring();

// 获取状态
const status = monitorStarter.getSystemStatus();

// 健康检查
const health = await monitorStarter.healthCheck();

// 停止监控
await monitorStarter.stopCompleteMonitoring();
```

### 2. API 集成

系统自动集成到现有的工作流 API：

- 新帖子自动推送到 `post_nlp_queue`
- 触发完整的 NLP 分析工作流
- 自动创建事件和统计信息

## 📊 监控指标

### 系统状态

```typescript
{
  isStarted: boolean,           // 是否运行中
  monitorStatus: {
    currentInterval: number,    // 当前监控间隔
    consecutiveFailures: number // 连续失败次数
  },
  detectorStatus: {
    cacheSize: number,          // 检测缓存大小
    maxCacheSize: number,       // 最大缓存大小
    cacheUtilization: number    // 缓存利用率
  },
  publisherStatus: {
    processedCount: number,     // 已处理帖子数
    cacheUtilization: number    // 推送缓存利用率
  },
  integratorStatus: {
    processedCount: number,     // 工作流处理数
    batchSize: number,          // 批次大小
    batchDelay: number          // 批次延迟
  }
}
```

### 健康检查

```typescript
{
  healthy: boolean,             // 整体健康状态
  components: {
    monitor: boolean,           // 监控组件健康
    detector: boolean,          // 检测组件健康
    publisher: boolean,         // 推送组件健康
    integrator: boolean         // 集成组件健康
  },
  message: string               // 健康状态消息
}
```

## 🎨 设计理念

### 存在即合理

- 每个组件都有不可替代的职责
- 复用现有的基础设施和组件
- 消除重复代码和冗余功能

### 优雅即简约

- 代码自文档化，命名清晰表达意图
- 错误处理如哲学思考，每个错误都有明确策略
- 性能优化与代码美观并重

### 性能即艺术

- 智能频率控制减少无效请求
- 批量处理提高系统吞吐量
- 优雅降级保证系统稳定性

## 🔄 工作流程

1. **监控调度器** 定时执行热门时间线抓取
2. **增量检测器** 检测新帖子并去重
3. **实时推送器** 推送新帖子到 NLP 队列
4. **工作流集成器** 触发完整的 NLP 分析工作流
5. **现有工作流** 执行 NLP 分析和事件创建

## 🛠️ 故障排除

### 常见问题

1. **监控停止**
   - 检查连续失败次数是否超过阈值（5次）
   - 检查微博账号健康状态
   - 查看错误日志定位具体问题

2. **重复处理**
   - 检查 Redis 连接状态
   - 验证时间戳解析逻辑
   - 检查缓存清理机制

3. **队列积压**
   - 调整批次大小和延迟
   - 检查 NLP 消费者处理能力
   - 监控系统资源使用情况

### 日志级别

系统提供详细的日志输出：

- `🚀` - 启动和初始化
- `📊` - 状态和统计
- `🔍` - 检测和处理
- `❌` - 错误和异常
- `✅` - 成功操作

## 📈 性能优化

### 监控频率优化

系统根据帖子活跃度自动调整监控频率：

- **高活跃时段**: 增加监控密度
- **低活跃时段**: 减少资源消耗
- **异常时段**: 自动降级保护

### 内存优化

- 智能缓存大小控制
- 自动清理过期记录
- 避免内存泄漏

### 网络优化

- 批量请求减少网络开销
- 智能重试机制
- 优雅的错误恢复

## 🤝 贡献指南

欢迎贡献代码和改进建议！请遵循以下原则：

1. **存在即合理** - 每个改动都有明确目的
2. **优雅即简约** - 代码清晰、简洁、自文档化
3. **性能即艺术** - 优化同时保持代码美观

## 📄 许可证

本项目基于现有 @sker/workflow-run 架构构建，遵循相同的许可证条款。