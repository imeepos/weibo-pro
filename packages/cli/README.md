# @sker/cli

基于 RabbitMQ 的任务执行 CLI 工具，使用 @sker/core 依赖注入容器。

## 功能特性

- 📁 配置文件管理（`~/.sker/config.json`）
- 🐰 RabbitMQ 消息队列监听
- 🔧 任务注册和执行
- 💉 依赖注入支持

## 安装

```bash
pnpm install
```

## 配置

首次运行时会自动创建配置文件 `~/.sker/config.json`：

```json
{
  "rabbitmq": {
    "url": "amqp://localhost:5672"
  },
  "queues": [
    {
      "name": "task_queue",
      "prefetch": 1
    }
  ]
}
```

## 使用

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

### 生产运行

```bash
pnpm start
```

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                      CLI Entry                          │
│                    (main.ts)                            │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────────┐
│  ConfigService  │     │   TaskRegistry      │
│  (配置管理)      │     │   (任务注册表)       │
└────────┬────────┘     └──────────┬──────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐     ┌─────────────────────┐
│  @sker/mq       │     │   TaskExecutor      │
│  useQueue()     │────▶│   (任务执行器)       │
└─────────────────┘     └─────────────────────┘
```

## 添加自定义任务

在 `main.ts` 中注册任务处理器：

```typescript
const registry = root.get(TaskRegistry);

registry.register('my-task', async (payload) => {
  console.log('Processing:', payload);
  // 执行任务逻辑
});
```

## 消息格式

发送到队列的消息应符合以下格式：

```json
{
  "type": "echo",
  "payload": {
    "message": "Hello World"
  }
}
```

## 依赖

- `@sker/core` - 依赖注入容器
- `@sker/mq` - RabbitMQ 消息队列
