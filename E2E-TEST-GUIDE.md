# 端到端测试指南

## 测试目标

验证完整的三层架构消息流：

```
[手机端模拟] → [API 服务器] → [RabbitMQ] → [CLI 执行端] → [RabbitMQ] → [API 服务器] → [手机端模拟]
```

## 前置条件

### 1. 启动 RabbitMQ

```bash
# 使用 Docker 启动
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:management

# 或者启动已存在的容器
docker start rabbitmq

# 验证 RabbitMQ 是否运行
curl http://localhost:15672
```

### 2. 启动 API 服务器

在**终端 1** 运行：

```bash
# 在项目根目录
turbo dev --filter=@sker/api
```

等待输出：
```
✓ Built in XXXms
Nest application successfully started
```

### 3. 启动 CLI daemon

在**终端 2** 运行：

```bash
# 在项目根目录
cd packages/cli
pnpm dev
```

等待输出：
```
Worker started
```

## 运行测试

### 方式一：使用启动脚本（推荐）

在**终端 3** 运行：

```bash
# 在项目根目录
chmod +x run-e2e-test.sh
./run-e2e-test.sh
```

脚本会自动检查所有服务是否运行，然后执行测试。

### 方式二：手动运行

```bash
# 在项目根目录
npx tsx test-e2e.ts
```

## 预期输出

成功的测试输出应该是：

```
🚀 启动端到端集成测试...

📍 API 服务器: http://localhost:3000
🧪 测试命令: echo "Hello from E2E test"

✅ [1/6] Socket.IO 连接成功
   Socket ID: xxx

📤 [2/6] 发送命令到服务器...
   命令: echo "Hello from E2E test"

✅ [3/6] 任务已创建
   Task ID: xxx

✅ [4/6] Claude 会话已创建
   Session ID: xxx

✅ [5/6] 收到 Claude 响应
   消息内容: {...}

✅ [6/6] 任务执行完成
   Exit Code: 0

════════════════════════════════════════════════════════════
🎉 端到端测试全部通过！

📊 测试结果摘要:
════════════════════════════════════════════════════════════
✅ Socket.IO 连接:     PASS
✅ 任务创建:          PASS
✅ 会话创建:          PASS
✅ 响应接收:          PASS
✅ 任务完成:          PASS
════════════════════════════════════════════════════════════
```

## 测试覆盖的场景

1. ✅ **Socket.IO 连接** - 手机端成功连接到 API 服务器
2. ✅ **命令发送** - 命令通过 WebSocket 发送到服务器
3. ✅ **任务创建** - 服务器创建任务并发送到 RabbitMQ
4. ✅ **会话创建** - CLI 接收任务并创建 Claude 会话
5. ✅ **响应接收** - CLI 执行结果通过 RabbitMQ 返回到服务器
6. ✅ **消息转发** - 服务器将结果转发给手机端

## 故障排查

### 错误：Socket.IO 连接失败

**原因**: API 服务器未运行

**解决**:
```bash
turbo dev --filter=@sker/api
```

### 错误：任务创建后无响应

**原因**: CLI daemon 未运行或 RabbitMQ 未连接

**解决**:
1. 检查 RabbitMQ: `docker ps | grep rabbitmq`
2. 检查 CLI: `cd packages/cli && pnpm dev`

### 错误：连接 RabbitMQ 失败

**原因**: RabbitMQ 未启动

**解决**:
```bash
docker start rabbitmq
# 或
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management
```

## 查看日志

### API 服务器日志
在运行 API 的终端查看

### CLI daemon 日志
在运行 CLI 的终端查看

### RabbitMQ 管理界面
访问 http://localhost:15672
- 用户名: guest
- 密码: guest

在 Queues 标签可以看到 `claude.commands` 和 `claude.responses` 队列的消息流。

## 运行单元测试

```bash
# CLI 单元测试
cd packages/cli
pnpm test

# API 单元测试
cd apps/api
pnpm test src/claude

# 所有测试
turbo test
```

## 下一步

端到端测试通过后，可以：

1. **启动移动应用**
   ```bash
   cd apps/app
   npm install  # 首次需要安装依赖
   npx expo start
   ```

2. **构建生产版本**
   ```bash
   pnpm build
   ```

3. **部署到生产环境**
   - 配置生产环境的 RabbitMQ 地址
   - 使用 PM2 管理 CLI daemon
   - 配置 Nginx 反向代理
