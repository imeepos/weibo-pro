# DerivedNodeWorkbench 保存接线设计

- 日期：2026-04-26
- 状态：Draft for review
- 范围：`packages/workflow-ui`

## 背景

当前 `DerivedNodeWorkbench` 右侧操作区已经有“保存”按钮，但点击后只会 `console.log`，没有真实保存行为。对应代码位于：

- `packages/workflow-ui/src/components/DerivedNodeWorkbench/index.tsx`
- `packages/workflow-ui/src/store/derived-node-workbench.store.ts`
- `packages/workflow-ui/src/services/derived-node.api.ts`

现有前后端契约已经基本齐备：

1. 前端已提供 `saveDerivedNode(payload)` API 包装。
2. SDK 中已定义 `CreateDerivedNodePayload`。
3. API 侧 `DerivedNodeController` / `DerivedNodeService` 已能保存派生节点。

真正缺口有两个：

1. 保存按钮没有接到 API。
2. 当前 store 的 `toSavePayload()` 产物是工作台草稿结构，不是后端要求的最终保存结构。

另外，这里有一个容易踩坑但必须明确的语义：

- 运行时 `DERIVED_INPUT` / `DERIVED_OUTPUT` 是“覆盖基类端口元数据”而不是“追加”。
- 因此保存时如果只提交 `customOutputs`，发布后的派生节点会丢失基础节点原有输出端口。

## 目标

把 `DerivedNodeWorkbench` 的“保存”按钮接成一个真实、可验证、范围受控的保存动作，并保证：

1. 点击保存会调用现有 `saveDerivedNode`。
2. 工作台草稿数据会被转换成符合 `CreateDerivedNodePayload` 的最终请求体。
3. 保存成功和失败都有最小可见反馈。
4. 保存成功后保留当前工作台状态，便于继续调整或重试。
5. 派生节点保存后的输出端口语义与当前预览保持一致，不丢失基础输出。

## 非目标

本次不做这些事：

1. 不接发布按钮、不做发布流程。
2. 不做派生节点列表管理、刷新或跳转。
3. 不做“保存后自动重置工作台”。
4. 不做编辑已有派生节点、覆盖保存或版本管理。
5. 不改后端接口契约，也不扩展 `createdBy` 来源。

## 方案选择

### 方案 A：保留 store 作为工作台草稿，保存前再映射为后端 payload

这是本次采用方案。

优点：

- store 继续表达 UI 草稿状态，不直接耦合后端 DTO。
- 保存边界清晰，风险集中在一个小的 mapper。
- 便于单独测试 payload 映射逻辑。

缺点：

- 需要增加一个额外的纯函数或小 helper。

### 方案 B：直接把 `toSavePayload()` 改造成后端最终 payload

优点：

- 保存组件会更薄。

缺点：

- store 会直接绑定后端结构。
- `MetadataStep` 里“预览数据”和“保存数据”的职责会混在一起。

### 方案 C：顺手补齐保存、发布、列表闭环

优点：

- 一次性形成更完整流程。

缺点：

- 明显超出当前切片。
- 会把验证面从一个保存动作扩大到多个子流程。

## 选定实现

### 1. 保留 store 草稿语义

`useDerivedNodeWorkbench` 继续维护当前工作台草稿：

- `baseNode`
- `frozenInputs`
- `exposedInputs`
- `customOutputs`
- `nodeMetadata`

本次不强制把 store 的 `toSavePayload()` 重写成后端 DTO。保存边界新增一个小的 mapper，把草稿结构转换成最终请求体。

推荐把 mapper 放在 `DerivedNodeWorkbench` 目录旁的纯函数文件中，方便复用和测试。

### 2. 最终 payload 映射规则

保存时生成的 `CreateDerivedNodePayload` 采用以下语义：

1. `name = nodeMetadata.name.trim()`
2. `baseType = baseNode.type`
3. `frozenInputs = frozenInputs`
4. `nodeMetadata.class = { title, type, description }`
5. `nodeMetadata.inputs = exposedInputs`
6. `nodeMetadata.outputs = [...baseNode.metadata.outputs, ...customOutputs]`
7. `createdBy` 本次不传

细节约束：

1. `title`、`type` 与 `name` 一样在保存前做 `trim()`。
2. `description` 允许为空；空字符串可在映射时归一化为 `undefined`。
3. `inputs` 保留 `property`、`title`、`type`、`defaultValue` 等已有元信息，不退化成仅有属性名的数组。
4. `outputs` 必须包含基础输出和自定义输出，不能只保存 `customOutputs`。

### 3. 保存入口行为

`DerivedNodeWorkbench` 的保存按钮接成异步动作：

1. 若当前没有 `baseNode`，不发请求，直接提示错误。
2. 若 `name`、`title`、`type` 任一为空，不发请求，直接提示错误。
3. 构造最终 payload。
4. 调用 `saveDerivedNode(payload)`。
5. 保存中按钮进入禁用态，避免重复提交。
6. 请求完成后恢复按钮可用状态。

本次不做复杂表单校验系统，只做最小必需校验。

### 4. 反馈策略

反馈优先复用 `packages/workflow-ui` 已在使用的 `sonner`：

1. 成功时显示“保存成功”提示。
2. 失败时显示“保存失败”提示，并尽量透出后端返回的 `error.message`，例如“节点名称已存在”。
3. 为了保证当前 workbench 页面自己可见提示，在组件树中提供 `Toaster`。

本次不依赖 `apps/bigscreen` 私有的 `useToast`，避免把 `workflow-ui` 组件绑死到宿主应用实现上。

### 5. 保存成功后的状态

本次保存成功后：

1. 不自动调用 `reset()`
2. 不跳转页面
3. 不清空输入
4. 不自动触发发布

这样用户可以继续查看当前预览、修改字段，或在名称冲突修正后再次保存。

### 6. MetadataStep 的一致性

`MetadataStep` 当前的“保存数据”区域展示的是 store 草稿结构。保存接线后，这个区域如果继续展示草稿，会和真实请求体不一致。

因此本次同步调整为：

1. “预览元数据”继续展示当前预览结构。
2. “保存数据”改为展示最终映射后的保存 payload。

这样调试视图与真实保存行为一致，减少误导。

## 边界条件

### 未选择基础节点

- 点击保存不发请求
- 提示用户先选择元节点

### 基础信息不完整

- 点击保存不发请求
- 提示用户补全名称、标题、类型

### 名称重复或后端拒绝

- 保留当前工作台内容
- 展示后端错误信息
- 用户可直接修改后重试

### 自定义输出为空

- 允许保存
- 最终 `outputs` 仍至少包含基础节点原有输出

## 测试策略

优先补两层测试，范围只覆盖这次真实变化：

### 1. payload mapper 纯函数测试

验证：

1. 能把工作台草稿转换成 `CreateDerivedNodePayload`
2. `outputs` 会包含基础输出和自定义输出
3. `name`、`title`、`type` 会被 `trim()`
4. 空 `description` 会按设计归一化

### 2. `DerivedNodeWorkbench` 组件行为测试

验证：

1. 点击保存会用正确 payload 调用 `saveDerivedNode`
2. 保存中按钮会禁用，防止重复提交
3. 成功时显示成功提示
4. 失败时显示失败提示
5. 没有 `baseNode` 或必要字段为空时不会发请求

如果测试实现上需要缩小复杂度，允许把映射逻辑和组件交互拆成两个测试文件，但不要把测试范围扩展到发布、列表或 API 集成。

## 风险与缓解

### 风险 1：保存后丢失基础输出端口

缓解：

- 在 spec 中明确 `outputs = 基础输出 + 自定义输出`
- 用 mapper 纯函数测试锁定这个语义

### 风险 2：组件直接耦合宿主应用的 toast 能力

缓解：

- 复用 `workflow-ui` 现有 `sonner`
- 在当前组件内自行提供 `Toaster`

### 风险 3：成功后自动清空导致用户误以为数据丢失

缓解：

- 本次明确“不自动 reset”
- 用成功提示替代激进行为

## 预期交付

完成后，`DerivedNodeWorkbench` 的“保存”按钮将从无行为按钮变成一个真实可用的最小保存入口：它会把当前工作台草稿安全映射为后端 payload，保留基础输出语义，向用户给出明确反馈，并通过针对性的测试锁定这次行为。
