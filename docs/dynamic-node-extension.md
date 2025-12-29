# 元节点动态扩展系统 - 使用指南

## 概述

元节点动态扩展系统允许用户将配置好的元节点保存为新的具体节点，并发布到节点库供其他用户使用。

## 核心概念

### 元节点 vs 派生节点

- **元节点**：通用的可配置节点（如 `HttpRequestAst`）
- **派生节点**：基于元节点创建的具体节点（如 `WeiboPostDetailAst`）

### 固化输入（Frozen Inputs）

派生节点会"固化"某些输入值，这些值在派生节点中不再可配置，从而简化使用。

## 使用流程

### 1. 在 UI 中创建派生节点

```typescript
// 用户操作流程
1. 拖拽 HttpRequestAst 到画布
2. 配置参数：
   - method: 'GET'
   - url: 'https://weibo.com/ajax/statuses/show'
   - headers: { "Cookie": "..." }
3. 点击"保存为新节点"按钮
4. 输入节点名称：WeiboPostDetailAst
5. 输入节点标题：微博博文详情
6. 点击保存
```

### 2. 通过 API 创建派生节点

```typescript
// POST /api/derived-nodes
const response = await fetch('/api/derived-nodes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'WeiboPostDetailAst',
    baseType: 'HttpRequestAst',
    frozenInputs: {
      method: 'GET',
      url: 'https://weibo.com/ajax/statuses/show',
    },
    metadata: {
      title: '微博博文详情',
      type: 'crawler',
      description: '获取微博博文详情信息'
    }
  })
});

const derivedNode = await response.json();
console.log(derivedNode.id); // UUID
```

### 3. 发布派生节点

```typescript
// PUT /api/derived-nodes/:id/publish
await fetch(`/api/derived-nodes/${derivedNode.id}/publish`, {
  method: 'PUT'
});

// 发布后，节点会出现在节点面板中
```

### 4. 使用派生节点

```typescript
// 在工作流中使用
const workflow = {
  nodes: [
    {
      type: 'WeiboPostDetailAst',  // 使用派生节点
      id: 'node-1',
      // 只需配置未固化的输入
      headers: { Cookie: '...' }
      // method 和 url 已固化，无需配置
    }
  ]
};
```

## API 参考

### POST /api/derived-nodes

创建派生节点（草稿状态）

**请求体**：
```typescript
{
  name: string;           // 节点类名（必须以 Ast 结尾）
  baseType: string;       // 基类名称（如 'HttpRequestAst'）
  frozenInputs: Record<string, any>;  // 固化的输入值
  metadata: {
    title: string;        // 节点显示名称
    type: string;         // 节点类型（如 'crawler'）
    description?: string; // 节点描述
  };
}
```

**响应**：
```typescript
{
  id: string;
  name: string;
  status: 'draft';
  version: 1;
  createdAt: string;
}
```

### PUT /api/derived-nodes/:id/publish

发布派生节点

**响应**：
```typescript
{
  message: 'Node published successfully'
}
```

### GET /api/derived-nodes

获取所有派生节点列表

**响应**：
```typescript
[
  {
    id: string;
    name: string;
    baseType: string;
    status: 'draft' | 'published';
    metadata: { title: string; type: string; };
    createdAt: string;
  }
]
```

## 实现原理

### 运行时动态创建类

```typescript
// DynamicNodeRegistry.createDerivedClass()
const DerivedClass = {
  [className]: class extends BaseClass {
    type = className;
    constructor() {
      super();
      // 应用固化的输入值
      Object.assign(this, frozenInputs);
    }
  }
}[className];
```

### 自动加载机制

```typescript
// apps/api/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启动时加载所有已发布的派生节点
  const derivedNodeService = app.get(DerivedNodeService);
  await derivedNodeService.loadAll();

  await app.listen(3000);
}
```

## 最佳实践

### 1. 命名规范

- 节点类名必须以 `Ast` 结尾
- 使用 PascalCase 命名（如 `WeiboPostDetailAst`）
- 节点标题使用中文（如 "微博博文详情"）

### 2. 固化策略

**应该固化的输入**：
- 不会变化的配置（如 API URL、HTTP 方法）
- 业务逻辑相关的固定值

**不应该固化的输入**：
- 需要动态传递的数据（如 Cookie、请求体）
- 用户可能需要调整的参数

### 3. 版本管理

```typescript
// 创建新版本（未来功能）
await fetch('/api/derived-nodes', {
  method: 'POST',
  body: JSON.stringify({
    name: 'WeiboPostDetailAst',
    baseType: 'HttpRequestAst',
    frozenInputs: { /* 新配置 */ },
    metadata: { /* ... */ },
    parentVersion: 1  // 基于版本 1 创建
  })
});
```

## 示例：创建微博 API 节点库

```typescript
// 1. 微博博文详情
await createDerivedNode({
  name: 'WeiboPostDetailAst',
  baseType: 'HttpRequestAst',
  frozenInputs: {
    method: 'GET',
    url: 'https://weibo.com/ajax/statuses/show'
  },
  metadata: { title: '微博博文详情', type: 'crawler' }
});

// 2. 微博评论列表
await createDerivedNode({
  name: 'WeiboCommentListAst',
  baseType: 'HttpRequestAst',
  frozenInputs: {
    method: 'GET',
    url: 'https://weibo.com/ajax/statuses/comments'
  },
  metadata: { title: '微博评论列表', type: 'crawler' }
});

// 3. 微博用户信息
await createDerivedNode({
  name: 'WeiboUserInfoAst',
  baseType: 'HttpRequestAst',
  frozenInputs: {
    method: 'GET',
    url: 'https://weibo.com/ajax/profile/info'
  },
  metadata: { title: '微博用户信息', type: 'crawler' }
});

// 发布所有节点
await Promise.all([
  publishNode('WeiboPostDetailAst'),
  publishNode('WeiboCommentListAst'),
  publishNode('WeiboUserInfoAst')
]);
```

## 故障排查

### 问题：派生节点未出现在节点面板

**原因**：节点状态为 `draft` 或未重启应用

**解决**：
1. 确认节点已发布：`PUT /api/derived-nodes/:id/publish`
2. 重启应用以重新加载节点

### 问题：基类变更导致派生节点失效

**原因**：基类的输入/输出定义发生变化

**解决**：
1. 检查基类版本兼容性
2. 更新派生节点的 `frozenInputs`
3. 创建新版本的派生节点

### 问题：名称冲突

**原因**：节点名称已存在

**解决**：
1. 使用不同的名称
2. 或删除旧节点后重新创建

## 未来扩展

- [ ] 节点版本管理
- [ ] 节点市场（分享给其他用户）
- [ ] 节点模板库
- [ ] 可视化节点编辑器
- [ ] 节点依赖管理
