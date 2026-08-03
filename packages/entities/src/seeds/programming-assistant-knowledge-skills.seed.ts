/**
 * 编程助手种子数据 - 知识技能
 * 按主题从 programming-assistant.seed.ts 拆分而来。
 */
export const programmingAssistantKnowledgeSkills = [
  {
    name: 'design-patterns',
    title: '设计模式知识库',
    description: '常用设计模式和应用场景',
    type: 'knowledge' as const,
    scope: 'system' as const,
    content: `## 常用设计模式应用指南

### 创建型模式
- **工厂模式**：减少对象创建的耦合
- **单例模式**：全局唯一实例（谨慎使用）
- **构建者模式**：简化复杂对象构造
- **原型模式**：快速克隆对象

### 结构型模式
- **适配器模式**：接口不兼容时的适配
- **装饰器模式**：动态添加功能（避免继承膨胀）
- **外观模式**：简化复杂子系统的交互
- **代理模式**：控制对象的访问权限

### 行为型模式
- **观察者模式**：事件驱动和消息系统
- **策略模式**：算法的可选择实现
- **状态模式**：状态机和复杂流程
- **责任链模式**：请求的逐级处理

### 架构级模式
- **MVC/MVVM**：分离关注点
- **DDD领域驱动设计**：复杂业务建模
- **微服务**：系统解耦和独立扩展
- **事件溯源**：完整的数据和历史记录`,
  },
  {
    name: 'best-practices',
    title: '最佳实践规范',
    description: '编码、架构、测试的最佳实践',
    type: 'knowledge' as const,
    scope: 'system' as const,
    content: `## 编程最佳实践

### 命名约定
- 使用表达意图的名称（避免简写）
- 函数名体现其作用动词
- 类名表示其角色和责任
- 常量使用大写下划线分隔

### 函数设计
- 单一职责：一个函数做一件事
- 参数不超过3个（否则考虑对象参数）
- 函数长度不超过20行（目标）
- 避免副作用

### 类设计
- 高内聚低耦合
- 继承层级不超过3层
- 接口要求越少越好
- 组合优于继承

### 错误处理
- 及早验证输入
- 有意义的错误信息
- 避免吞掉异常
- 考虑优雅降级

### 性能指南
- 在有数据支撑前不优化
- 使用profiler定位瓶颈
- 可读性优于微观优化
- 算法优化优于代码优化

### 测试实践
- 单元测试覆盖逻辑
- 集成测试验证交互
- 避免过度mocking
- 测试应该驱动设计`,
  },
  {
    name: 'tech-stack-guide',
    title: '技术栈指南',
    description: '项目技术栈的使用建议和常见模式',
    type: 'knowledge' as const,
    scope: 'system' as const,
    content: `## Weibo-Pro 技术栈使用指南

### 依赖注入系统 (@sker/core)
- 全局单例根注入器自动注册所有 @Injectable() 服务
- 使用 providedIn 控制作用域（auto/root/platform/application）
- 支持 @Optional(), @Self(), @SkipSelf() 装饰器
- 循环依赖会被自动检测

### 工作流引擎 (@sker/workflow)
- 基于AST的节点执行系统
- @Node/@Input/@Output 装饰器定义节点
- 支持多值输入和条件边
- 错误隔离使用 NoRetryError 标记

### 数据库 (@sker/entities)
- TypeORM 实体模型
- 订阅器模式触发异步任务
- 迁移管理通过 typeorm migration
- 种子数据在启动时初始化

### 消息队列 (@sker/mq)
- RabbitMQ 生产者-消费者模式
- RxJS Observable 处理异步消息
- batch() 方法支持批量发布
- NoRetryError 支持不可重试错误

### API 层 (@sker/api)
- NestJS 作为HTTP层facade
- 实际服务由 @sker/core DI管理
- 在 app.module.ts 注册DI服务
- 使用拦截器处理横切关注点`,
  },
];
