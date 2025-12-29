# 元节点动态扩展系统

## 核心文件

### 1. DerivedNodeEntity (数据库实体)
**位置**: `packages/entities/src/derived-node.entity.ts`

保存派生节点的配置信息：
- `name`: 节点名称（唯一）
- `baseType`: 基类节点类型
- `frozenInputs`: 冻结的输入值
- `metadata`: 节点元数据
- `status`: 状态（draft/published）
- `version`: 版本号

### 2. DynamicNodeRegistry (运行时注册器)
**位置**: `packages/workflow/src/dynamic-node-registry.ts`

运行时动态创建和注册节点：
- `register()`: 注册派生节点
- `createDerivedClass()`: 创建派生类
- `registerNode()`: 注册到全局注册表

### 3. DerivedNodeService (业务服务)
**位置**: `apps/api/src/services/workflow/derived-node.service.ts`

管理派生节点的生命周期：
- `saveAsNode()`: 保存节点配置
- `publish()`: 发布节点到运行时
- `loadAll()`: 启动时加载所有已发布节点
- `list()`: 列出所有节点

### 4. DerivedNodeController (REST API)
**位置**: `apps/api/src/controllers/workflow/derived-node.controller.ts`

提供 HTTP 接口：
- `POST /api/derived-nodes`: 创建节点
- `PUT /api/derived-nodes/:id/publish`: 发布节点
- `GET /api/derived-nodes`: 列出所有节点

## 使用流程

### 1. 创建派生节点

```typescript
POST /api/derived-nodes
{
  "name": "MyCustomNode",
  "baseType": "TextAreaAst",
  "frozenInputs": {
    "prompt": "固定的提示词"
  },
  "metadata": {
    "title": "我的自定义节点",
    "type": "basic"
  }
}
```

### 2. 发布节点

```typescript
PUT /api/derived-nodes/{id}/publish
```

发布后，节点会被注册到运行时，可以在工作流中使用。

### 3. 使用节点

发布后的节点会自动出现在节点列表中，可以像使用普通节点一样使用。

## 设计原则

- **存在即合理**: 每个类、方法都有不可替代的存在理由
- **优雅即简约**: 最简洁的实现，无冗余代码
- **继承元数据**: 派生类自动继承基类的 Input/Output/State 定义
- **运行时注册**: 启动时自动加载已发布节点
