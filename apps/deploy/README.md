# Weibo-Pro 自动化部署

基于 GitHub Webhooks 的自动化部署系统。当 `main` 分支收到 push 事件时，自动执行构建和部署。

## 架构

```
GitHub Push → Webhook 触发 → 签名验证 → 拉取代码 → 构建 → Docker 部署
```

## 文件说明

- **webhook-server.js** - Webhook 服务器（Node.js + HTTP）
- **build.sh** - 构建和部署脚本
- **ecosystem.config.js** - PM2 进程管理配置
- **.env.deploy.example** - 环境变量模板

## 部署步骤

### 1. 服务器环境准备

确保服务器已安装以下依赖：

```bash
# Node.js (>= 18)
node --version

# PM2（全局安装）
npm install -g pm2

# Docker & Docker Compose
docker --version
docker compose version

# pnpm（可选，优先使用）
npm install -g pnpm
```

### 2. 克隆仓库到服务器

```bash
cd /home
git clone <your-repo-url> weibo-pro
cd weibo-pro
```

### 3. 配置环境变量

```bash
cd deploy
cp .env.deploy.example .env.deploy
nano .env.deploy
```

编辑 `.env.deploy`：

```bash
WEBHOOK_PORT=9000
WEBHOOK_SECRET=your-strong-secret-here   # 生成强密钥（见下方说明）
REPO_PATH=/home/weibo-pro
BRANCH=main
```

**生成强密钥**：

```bash
# Linux/macOS
openssl rand -hex 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 设置脚本权限

```bash
chmod +x build.sh
chmod +x webhook-server.js
```

### 5. 创建日志目录

```bash
mkdir -p /home/weibo-pro/logs
```

### 6. 启动 Webhook 服务

```bash
# 使用 PM2 启动（推荐）
pm2 start ecosystem.config.js

# 或直接运行（测试用）
node webhook-server.js
```

### 7. 配置防火墙

```bash
# 开放 Webhook 端口（如果使用防火墙）
sudo ufw allow 9000/tcp

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
```

### 8. 配置 GitHub Webhook

在 GitHub 仓库中设置 Webhook：

1. 进入仓库 **Settings → Webhooks → Add webhook**
2. 配置参数：
   - **Payload URL**: `http://your-server-ip:9000/webhook`
   - **Content type**: `application/json`
   - **Secret**: 填写 `.env.deploy` 中的 `WEBHOOK_SECRET`
   - **Events**: 选择 `Just the push event`
   - **Active**: ✓
3. 点击 **Add webhook**

### 9. 测试部署

在本地推送代码到 `main` 分支：

```bash
git push origin main
```

查看服务器日志：

```bash
pm2 logs weibo-webhook
```

## PM2 管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs weibo-webhook

# 重启服务
pm2 restart weibo-webhook

# 停止服务
pm2 stop weibo-webhook

# 删除服务
pm2 delete weibo-webhook

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup
```

## 日志位置

- **Webhook 日志**: `/home/weibo-pro/logs/webhook-*.log`
- **PM2 日志**: `~/.pm2/logs/`

## 构建流程

`build.sh` 执行以下步骤：

1. **拉取代码** - `git fetch && git reset --hard origin/main`
2. **安装依赖** - `pnpm install --frozen-lockfile`
3. **执行构建** - `pnpm run build`
4. **停止容器** - `docker compose down`
5. **启动容器** - `docker compose up -d`

## 安全建议

1. **使用强密钥** - `WEBHOOK_SECRET` 至少 32 字节
2. **使用反向代理** - 通过 Nginx 代理 Webhook 服务，启用 HTTPS
3. **限制访问** - 仅允许 GitHub IP 访问 Webhook 端点
4. **定期更新密钥** - 定期轮换 `WEBHOOK_SECRET`

### Nginx 反向代理示例

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /webhook {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

更新 GitHub Webhook URL 为：`https://your-domain.com/webhook`

## 故障排查

### Webhook 未触发

1. 检查 GitHub Webhook 配置中的「Recent Deliveries」是否成功
2. 查看响应状态码和错误信息
3. 确认服务器防火墙已开放端口

### 签名验证失败

1. 确认 `.env.deploy` 中的 `WEBHOOK_SECRET` 与 GitHub 配置一致
2. 检查 Webhook 服务日志：`pm2 logs weibo-webhook`

### 构建失败

1. 手动执行构建脚本测试：`bash deploy/build.sh`
2. 检查 Node.js、pnpm、Docker 是否正常
3. 确认仓库目录权限正确

### PM2 服务未启动

```bash
# 检查 PM2 状态
pm2 status

# 重新加载配置
pm2 reload ecosystem.config.js

# 查看详细错误
pm2 logs weibo-webhook --err
```

## 手动部署

如需手动触发部署：

```bash
cd /home/weibo-pro
bash deploy/build.sh
```

## License

MIT
