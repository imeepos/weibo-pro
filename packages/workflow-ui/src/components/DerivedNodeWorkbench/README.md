# 元节点定制工作台

## 概述

元节点定制工作台（DerivedNodeWorkbench）是一个用于创建派生节点的可视化工具。通过选择基础节点、冻结部分输入、暴露必要端口，可以快速创建定制化的工作流节点。

## 架构

### 3栏布局
- **左栏**：元节点选择器（MetaNodePicker）
- **中栏**：配置编辑器（ConfigEditor）
- **右栏**：实时预览（NodePreview）

### 4步配置流程
1. **基础信息**：设置节点名称、标题、类型、描述
2. **冻结输入**：选择哪些输入端口冻结为固定值，哪些暴露给用户
3. **端口配置**：查看暴露的输入端口，添加自定义输出端口
4. **元数据**：预览最终配置和保存数据

## 使用方式

```tsx
import { DerivedNodeWorkbench } from '@sker/workflow-ui'

function App() {
  return <DerivedNodeWorkbench />
}
```

## 状态管理

使用 zustand + immer 管理工作台状态：

```typescript
import { useDerivedNodeWorkbench } from '@sker/workflow-ui'

function MyComponent() {
  const {
    baseNode,           // 选中的基础节点
    frozenInputs,       // 冻结的输入值
    exposedInputs,      // 暴露的输入端口
    customOutputs,      // 自定义输出端口
    nodeMetadata,       // 节点元数据
    currentStep,        // 当前步骤

    selectBaseNode,     // 选择基础节点
    setFrozenInput,     // 设置冻结输入
    toggleInputExposed, // 切换输入暴露状态
    addCustomOutput,    // 添加自定义输出
    updateMetadata,     // 更新元数据
    setStep,            // 切换步骤
    reset,              // 重置
    getPreviewMetadata, // 获取预览数据
    toSavePayload,      // 获取保存数据
  } = useDerivedNodeWorkbench()
}
```

## 文件结构

```
packages/workflow-ui/src/
├── components/DerivedNodeWorkbench/
│   ├── index.tsx                      # 主组件（3栏布局）
│   ├── MetaNodePicker.tsx             # 左栏：元节点选择器
│   ├── ConfigEditor.tsx               # 中栏：配置编辑器
│   ├── steps/
│   │   ├── BasicInfoStep.tsx          # Step 1: 基础信息
│   │   ├── FrozenInputsStep.tsx       # Step 2: 冻结输入
│   │   ├── PortConfigStep.tsx         # Step 3: 端口配置
│   │   └── MetadataStep.tsx           # Step 4: 元数据
│   └── NodePreview.tsx                # 右栏：节点预览
├── store/derived-node-workbench.store.ts  # 状态管理
└── services/derived-node.api.ts       # API 封装（待实现）
```

## 核心功能

### 1. 元节点选择
- 搜索过滤节点
- 点击选择基础节点
- 自动提取节点元数据

### 2. 输入冻结
- 查看所有输入端口
- 选择暴露或冻结
- 为冻结端口设置固定值

### 3. 端口配置
- 查看暴露的输入端口
- 添加自定义输出端口
- 配置端口属性（名称、类型、描述）

### 4. 实时预览
- 实时显示节点外观
- 预览端口配置
- 查看保存数据结构

## 保存数据格式

```typescript
{
  baseNodeType: string              // 基础节点类型
  frozenInputs: Record<string, any> // 冻结的输入值
  exposedInputs: string[]           // 暴露的输入端口名称
  customOutputs: INodeOutputMetadata[] // 自定义输出端口
  metadata: {
    name: string        // 节点名称
    title: string       // 节点标题
    type: string        // 节点类型
    description: string // 节点描述
  }
}
```

## 设计原则

- **存在即合理**：每个组件、状态都有明确用途
- **优雅即简约**：最小化实现，避免过度设计
- **复用优先**：使用现有组件（SmartFormField, DynamicPortItem, WorkflowNode）
- **类型安全**：完整的 TypeScript 类型定义
