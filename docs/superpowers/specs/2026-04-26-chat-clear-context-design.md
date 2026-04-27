# Chat 清空上下文设计

- 日期：2026-04-26
- 状态：Approved for planning
- 范围：`apps/app`

## 背景

当前聊天页右上角的 `ChatSettings` 面板已经提供“清空上下文”按钮，但点击确认后没有任何真实行为，只会关闭面板。对应代码位于：

- `apps/app/src/components/ChatSettings.tsx`
- `apps/app/src/store/chat.store.ts`
- `apps/app/src/pages/ChatPage.tsx`

现有 store 已经具备一个接近目标的动作：`clearMessages(taskId)`。它会清空指定任务的 `messages`，同时把 `session` 置空、`messageSequence` 置零。因此这次工作不需要重建任务模型，也不需要改 tab 生命周期。

## 目标

把 `ChatSettings` 的“清空上下文”接成一个真实可用的动作，并保证：

1. 只影响当前激活任务
2. 清空后页面回到聊天空态
3. 不关闭 task tab，不创建新 task，不影响其他 task
4. 后续再次发送消息时，会以新的 session 重新开始

## 非目标

本次不做这些事：

1. 不新增“清空全部任务”能力
2. 不自动新建 task
3. 不修改 task 名称
4. 不改 socket 协议
5. 不处理“服务端历史消息同步删除”之类超出当前前端 store 范围的需求

## 方案选择

### 方案 A：清空当前激活任务的消息和 session，保留当前 tab

这是本次采用方案。

优点：

- 复用现有 `clearMessages(taskId)`，改动最小
- 与当前 `ChatPage` 空态兼容，不需要改页面结构
- 不影响多任务模型，风险最低

缺点：

- task 名称还保留原值，例如仍然可能显示“任务 A”

### 方案 B：清空当前任务并重置任务名

优点：

- “新会话”语义更强

缺点：

- 需要额外定义任务命名策略
- 影响比当前需求更大

### 方案 C：关闭当前任务并新建 task

优点：

- 从行为上最接近“全新会话”

缺点：

- 会改变 tab 生命周期
- 容易影响多任务切换和持久化逻辑

## 选定实现

### 1. 组件侧行为

`ChatSettings` 读取 store 中的：

- `activeTaskId`
- `clearMessages(taskId)`

点击“清空上下文”后：

1. 弹出确认框
2. 若当前存在 `activeTaskId`，调用 `clearMessages(activeTaskId)`
3. 关闭设置面板

若当前没有激活任务，则只关闭面板，不抛错。

### 2. 状态侧行为

沿用现有 `clearMessages(taskId)` 语义：

- `messages` 清空
- `session` 置空
- `messageSequence` 归零

本次不改：

- `serverTaskId`
- `task.name`
- `tokenUsage`
- 其他 task 的任意状态

### 3. 页面侧结果

`ChatPage` 当前已经有条件分支：

- 没有消息时显示空态
- 有消息时显示消息流

因此在 `clearMessages(activeTaskId)` 之后，当前 task 会自然回到“开始新的对话”空态，不需要额外页面代码。

### 4. 会话连续性

因为 `session` 被清空，下一次在当前 task 里发送消息时，`sendMessage` 会带着 `sessionId: undefined` 重新开始一次新会话。这符合“清空上下文并开始新会话”的预期。

## 边界条件

### 没有激活任务

- 不报错
- 不调用 `clearMessages`
- 仍然关闭设置面板

### 当前任务本来就是空的

- 允许重复清空
- 结果保持为空

### 多任务场景

- 只清空当前激活 task
- 其他 task 的消息和 session 不变

## 测试策略

优先补两个层级的测试：

### 1. `ChatSettings` 组件测试

验证：

- 点击“清空上下文”会在确认后调用 `clearMessages(activeTaskId)`
- 没有 `activeTaskId` 时不会报错

### 2. `ChatPage` 行为回归测试

验证：

- 当前任务消息被清空后，页面重新显示空态文案

如果仓库里缺少适合的现成测试文件，可以新增针对 `ChatSettings` 的测试文件；保持测试范围只覆盖这次行为变更。

## 风险与缓解

### 风险 1：误清空非当前任务

缓解：

- 严格使用 `activeTaskId`
- 测试中显式构造多任务场景

### 风险 2：清空后页面没有回到空态

缓解：

- 用页面级测试锁定“开始新的对话”空态

### 风险 3：清空后后续消息仍沿用旧 session

缓解：

- 依赖现有 `clearMessages` 已把 `session` 置空
- 在 store 测试或组件测试中检查该行为

## 预期交付

完成后，用户在聊天页点击右上角设置中的“清空上下文”时，会获得一个真正有效、范围受控、可回归验证的当前任务清空能力，而不是一个无行为按钮。
