# 部署文档

## 环境变量清单

### 数据库配置

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | ✓ | - | PostgreSQL 连接字符串 |
| `REDIS_URL` | ✓ | - | Redis 连接字符串 |
| `RABBITMQ_URL` | ✓ | - | RabbitMQ 连接字符串 |
| `MONGODB_URL` | ✓ | - | MongoDB 连接字符串 |

### API 配置

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `PORT` | ✓ | `3000` | API 服务端口 |
| `API_BASE_URL` | ✓ | `http://localhost:8089` | API 基础 URL |
| `S3_BASE_URL` | ✓ | `http://localhost:8089` | S3 兼容存储基础 URL |

### AI 服务配置

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `OPENAI_BASE_URL` | ✓ | - | OpenAI 兼容 API 基础 URL |
| `OPENAI_API_KEY` | ✓ | - | OpenAI API 密钥 |

### 第三方服务

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `AMAP_API_KEY` | ✓ | - | 高德地图 API 密钥 |

### 代理服务配置

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `KUAIDAILI_SECRET_ID` | ✓ | - | 快代理 Secret ID |
| `KUAIDAILI_SECRET_KEY` | ✓ | - | 快代理 Secret Key |
| `KUAIDAILI_USERNAME` | ✓ | - | 快代理用户名 |
| `KUAIDAILI_PASSWORD` | ✓ | - | 快代理密码 |

### 运行环境

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `DEV` | ✗ | `false` | 开发模式标志 |
| `TZ` | ✗ | `UTC` | 时区设置 |

## 快速开始

### 使用 Docker Compose

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 文件，填入必需的环境变量

# 3. 启动所有服务
docker-compose up -d

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f api
```

### 手动部署

#### 前置要求

- Node.js 20+
- pnpm 8+
- PostgreSQL 16+
- Redis 7+
- RabbitMQ 3+
- MongoDB 7+

#### 部署步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 构建依赖包
pnpm build:deps

# 3. 构建应用
pnpm build --filter=@sker/api

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 5. 初始化数据库
psql -h localhost -U postgres -d vectordb -f scripts/init-db.sql

# 6. 启动服务
pnpm start
```

## 健康检查

### API 服务

```bash
curl http://localhost:8089/health
```

### 数据库

```bash
# PostgreSQL
pg_isready -h localhost -U postgres

# Redis
redis-cli -a Redis2025Complex ping

# RabbitMQ
curl -u admin:RabbitMQ2025Secure http://localhost:15672/api/overview

# MongoDB
mongosh --eval "db.adminCommand('ping')"
```

## 故障排查

### 常见问题

1. **端口被占用**
   ```bash
   # 查看端口占用
   lsof -i :8089
   # 或
   netstat -ano | findstr :8089
   ```

2. **数据库连接失败**
   - 检查数据库服务是否运行
   - 验证连接字符串格式
   - 确认网络可达性

3. **依赖包构建失败**
   ```bash
   # 清理缓存重新构建
   pnpm clean:cache
   pnpm build:force
   ```

## 监控

- API 服务: http://localhost:8089
- RabbitMQ 管理界面: http://localhost:15672
- 日志: `docker-compose logs -f [service-name]`
