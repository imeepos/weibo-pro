# IP-Proxy 测试套件

## 测试覆盖

### 核心模块 (Core)
- ✅ `proxy-cache.test.ts` - Redis 缓存层测试
- ✅ `proxy-pool.test.ts` - 代理池管理测试
- ✅ `proxy-validator.test.ts` - 代理验证器测试
- ✅ `proxy-scorer.test.ts` - 评分系统测试
- ✅ `proxy-health-checker.test.ts` - 健康检查器测试

### 提供商 (Providers)
- ✅ `kuaidaili-provider.test.ts` - 快代理提供商测试

### 工具函数 (Utils)
- ✅ `time.test.ts` - 时间工具函数测试
- ✅ `proxy-url-parser.test.ts` - 代理URL解析器测试

## 测试覆盖的边界情况

### 1. 空值和 null/undefined 处理
- 代理池为空时的行为
- 获取代理失败时的降级逻辑
- Redis 元数据缺失的处理
- 无效的代理配置

### 2. 并发和竞态条件
- 多个请求同时获取代理
- 并发添加代理到缓存
- 并发增减使用计数
- 代理健康检查的并发执行

### 3. 边界值
- 代理评分的最大/最小值 (0-100)
- TTL 过期的临界点
- 时间戳的秒/毫秒转换边界
- 缓冲时间的边界情况

### 4. 错误处理
- 网络请求失败
- Redis 连接失败
- Provider API 返回异常数据
- 代理验证失败
- 超时错误

### 5. 状态转换
- 代理从可用到过期的状态切换
- 缓存更新和失效
- 健康检查结果对状态的影响
- 评分的动态更新

## 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage

# UI 模式
pnpm test:ui
```

## Mock 策略

### Redis Mock
- 使用内存 Map 模拟 Sorted Set 和 Hash 操作
- 完全独立的测试环境，无需真实 Redis

### Logger Mock
- 使用 Vitest mock 函数
- 可验证日志调用但不产生实际输出

### Axios Mock
- 使用 Vitest 的 `vi.mock('axios')`
- 模拟网络请求和响应

## 测试原则

### FIRST 原则
- **Fast**: 所有测试使用 mock，无外部依赖
- **Independent**: 每个测试相互独立，使用 beforeEach 清理
- **Repeatable**: 使用 fake timers，结果可重复
- **Self-validating**: 明确的 expect 断言
- **Timely**: 测试与实现同步开发

### AAA 模式
- **Arrange**: 设置测试数据和 mock
- **Act**: 执行被测试的函数
- **Assert**: 验证结果和副作用

## 待实现的测试

- [ ] `axios-interceptor.test.ts` - Axios 拦截器集成测试
- [ ] `browser-launcher.test.ts` - 浏览器启动器测试
- [ ] 端到端集成测试
- [ ] 性能基准测试

## 测试指标

目标覆盖率:
- 语句覆盖率 (Statement): > 80%
- 分支覆盖率 (Branch): > 75%
- 函数覆盖率 (Function): > 90%
- 行覆盖率 (Line): > 80%
