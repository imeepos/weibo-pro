# 前端组件检查清单

## 使用方式
```
请检查 [组件路径] 是否符合最佳实践，给出评分和改进建议。
```

---

## 🏗️ 架构与设计 (15分)

### DI 容器使用
- [ ] 使用 `root.get(Controller)` 而非直接 API 调用
- [ ] Controller 从 `@sker/core` 注入

### 自定义 Hooks
- [ ] 数据获取封装为 Hook (参考 `useChartData.ts`)
- [ ] 实现：缓存、重试、取消、错误处理
- [ ] 避免组件内直接 useEffect + API 调用

### 状态管理
- [ ] 本地状态用 `useState`
- [ ] 全局状态用 `useAppStore` (Zustand)
- [ ] 复杂状态流用 `@sker/store` (RxJS)
- [ ] URL 状态 (分页/筛选) 与 Router 同步

---

## 📦 代码组织 (15分)

### 组件拆分
- [ ] 单文件 < 300 行
- [ ] 提取：容器组件、展示组件、业务组件
- [ ] 重复 JSX 提取为子组件

### 复用性
- [ ] 工具函数移到 `@/utils` 或独立文件
- [ ] 避免组件内定义纯函数
- [ ] 类型定义在 `@/types`

---

## 🎨 UI/UX (15分)

### 三态处理
- [ ] Loading: 使用 Skeleton 而非文字
- [ ] Empty: 有插图、文案、引导按钮
- [ ] Error: 向用户展示 + 重试机制

### 响应式
- [ ] 适配移动端 (sm/md/lg/xl)
- [ ] 对话框在移动端可用

---

## 🔧 性能优化 (15分)

### React 优化
- [ ] 计算密集操作用 `useMemo`
- [ ] 回调函数用 `useCallback`
- [ ] 列表项用 `React.memo`

### 数据渲染
- [ ] 长列表 (>50) 用虚拟滚动 (`useVirtualList`)
- [ ] 大数据集用服务端分页
- [ ] 图片懒加载 (`loading="lazy"`)

---

## 🔒 数据安全 (10分)

### 防御性编程
- [ ] API 数据验证 (`Array.isArray`)
- [ ] 使用可选链 (`?.`) 和空值合并 (`??`)
- [ ] 对象属性访问有默认值

### 输入处理
- [ ] 搜索框用 `useDebounce`
- [ ] 滚动/Resize 用 `useThrottle`

---

## 🧪 代码质量 (15分)

### 清洁度
- [ ] 无未使用的 import
- [ ] 无注释代码、console.log
- [ ] 魔法数字提取为常量

### 命名与日志
- [ ] 组件 PascalCase，变量 camelCase
- [ ] 布尔值用 is/has/should 前缀
- [ ] 使用 `createLogger` 而非 console

### 注释原则 (代码艺术家)
- [ ] 通过命名消除注释需求
- [ ] 注释解释 WHY 而非 WHAT
- [ ] 复杂逻辑有必要说明

---

## 🎭 用户体验 (10分)

### 交互反馈
- [ ] 按钮有 hover/active 状态
- [ ] 异步操作有 loading 反馈
- [ ] 操作有成功/失败提示

### 键盘与无障碍
- [ ] 支持键盘导航 (Tab/Enter/Space)
- [ ] 图片有 `alt`，按钮有 `aria-label`
- [ ] 表单 `label` 关联，对话框 `role="dialog"`

---

## 🎨 代码艺术家哲学 (5分)

### 存在即合理
- [ ] 每个变量/函数/组件有存在必要
- [ ] 无冗余逻辑和过度设计

### 优雅即简约
- [ ] 逻辑清晰直观，嵌套 < 3 层
- [ ] 避免过度复杂的条件判断

### 性能即艺术
- [ ] 性能优化不影响可读性
- [ ] 先正确性，后优化

### 错误处理有温度
- [ ] 错误信息友好，提供解决方案
- [ ] 记录完整上下文便于排查

---

## 📊 输出格式

### 评分
```
总分: __/100
├─ 架构设计: __/15
├─ 代码组织: __/15
├─ UI/UX: __/15
├─ 性能优化: __/15
├─ 数据安全: __/10
├─ 代码质量: __/15
├─ 用户体验: __/10
└─ 艺术家哲学: __/5
```

### 问题清单 (按优先级)
**🔴 高优先级** - 影响功能或架构
**🟡 中优先级** - 性能与可维护性
**🟢 低优先级** - 体验优化

### 优秀实践
列出值得称赞的实践

### Top 3 改进建议
1. [最重要的改进] - 预期收益
2. [次要改进] - 预期收益
3. [优化项] - 预期收益

---

## 快速参考

### 反模式示例

```typescript
// ❌ 直接 API 调用
const data = await UsersAPI.getList();

// ✅ 使用 DI
const controller = root.get(UsersController);
const data = await controller.getList();
```

```typescript
// ❌ 组件内数据获取
useEffect(() => {
  loadData().then(setData);
}, []);

// ✅ 封装 Hook
const { data, loading, error } = useCustomData();
```

```typescript
// ❌ 魔法数字
setTimeout(fn, 30000);
const size = 10;

// ✅ 常量命名
const REFETCH_INTERVAL = 30_000;
const DEFAULT_PAGE_SIZE = 10;
```

### 决策树

**状态管理选型**:
```
跨组件共享？
├─ 否 → useState
└─ 是 → 需要持久化？
    ├─ 否 → useAppStore
    └─ 是 → @sker/store
```

**组件拆分信号**:
- 代码 > 300 行
- 重复 JSX 结构
- 独立业务逻辑
- 多个职责混杂
