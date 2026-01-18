# 部署检查清单

## 部署前检查

- ✅ SDK 代码已更新 (packages/sdk/src/controllers/events.controller.ts)
- ✅ API 代码已更新 (apps/api/src/controllers/events.controller.ts)
- ✅ SDK 已构建 (dist/index.js, dist/index.d.ts)
- ✅ API 已构建 (dist/main.js)
- ✅ 代码已提交 (commits c1f81a99, 2fac35c7)
- ✅ 本地验证通过（路由元数据、装饰器）

## 部署步骤

### 1. 在生产服务器拉取代码

```bash
ssh user@43.240.223.138
cd /path/to/weibo-pro
git pull origin main
```

### 2. 构建项目

```bash
pnpm build --filter=@sker/sdk
pnpm build --filter=@sker/api
```

### 3. 重启 API 服务

```bash
# 停止旧服务
pm2 stop weibo-api
# 或
systemctl stop weibo-api

# 启动新服务
pm2 start npm --name "weibo-api" -- run start:prod
# 或
systemctl start weibo-api

# 检查日志
pm2 logs weibo-api --lines 50
# 或
journalctl -u weibo-api -n 50 -f
```

### 4. 验证部署

```bash
# 健康检查
curl -s http://localhost:8089/health

# 测试 keywords 端点
curl -s 'http://localhost:8089/api/auth/events/keywords?id=3b626b71-0fc5-4dcf-a789-e07242310ad5' | jq .

# 测试 timeseries 端点
curl -s 'http://localhost:8089/api/auth/events/timeseries?id=3b626b71-0fc5-4dcf-a789-e07242310ad5' | jq .

# 测试带参数的端点
curl -s 'http://localhost:8089/api/auth/events/keywords-timeseries?id=3b626b71-0fc5-4dcf-a789-e07242310ad5&topN=10' | jq .
```

### 5. 验证静态路由

```bash
# 确保静态路由仍然工作
curl -s 'http://localhost:8089/api/auth/events/list' | jq '.success'
```

## 部署后验证清单

- [ ] API 服务启动成功
- [ ] 健康检查端点返回 200
- [ ] keywords?id=xxx 返回 200
- [ ] timeseries?id=xxx 返回 200
- [ ] detail?id=xxx 返回 200
- [ ] sentiment-distribution?id=xxx 返回 200
- [ ] keywords-timeseries?id=xxx&topN=10 返回 200
- [ ] 所有其他动态路由工作正常
- [ ] 静态路由继续工作
- [ ] 无错误日志

## 回滚计划

如果部署后发现问题：

```bash
# 回滚到上一个版本
git revert HEAD~1..HEAD
pnpm build
pm2 restart weibo-api
```

## 相关文档

- [测试报告](./TASK3_TEST_REPORT.md)
- [API 规范](./apps/api/API_EXAMPLES.md)
- [部署文档](./DEPLOYMENT.md)
