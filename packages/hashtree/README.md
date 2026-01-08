# @sker/hashtree

基于哈希树的文件管理系统，支持高效检索和增量更新。

## 核心概念

### HashTree

树形数据结构，每个节点存储内容的哈希值，用于快速检测变化。

```typescript
import { HashTree, path } from '@sker/hashtree'

const tree = new HashTree()

tree.insert(path('src', 'index.ts'), 'const x = 1')
tree.insert(path('src', 'utils.ts'), 'export const id = () => crypto.randomUUID()')

const node = tree.get(path('src', 'index.ts'))
console.log(node.hash, node.data)
```

### MemorySystem

内存索引系统，快速检索和查询。

```typescript
import { MemorySystem, path } from '@sker/hashtree'

const memory = new MemorySystem()

memory.insert(path('src', 'index.ts'), { type: 'file', content: 'code' })

const index = memory.queryPath(path('src', 'index.ts'))
console.log(index.hash, index.lastModified)

const changed = memory.queryChanged(Date.now() - 1000)
```

### FileWatcher

文件变化监听器，支持订阅特定路径的变化。

```typescript
import { MemorySystem, FileWatcher, path } from '@sker/hashtree'

const memory = new MemorySystem()
const watcher = new FileWatcher(memory)

const unsubscribe = watcher.watch(
  path('src'),
  (event) => {
    console.log('Change detected:', event.type, event.path)
  }
)

memory.insert(path('src', 'new.ts'), 'code')
unsubscribe()
```

## 使用场景

- 文件系统缓存
- 构建系统增量编译
- 配置中心热更新
- 分布式文件同步

## API

### path(...segments: string[]): Path

创建路径对象。

### HashTree

- `insert(path, data)`: 插入数据
- `get(path)`: 获取节点
- `remove(path)`: 删除节点
- `getRootHash()`: 获取根哈希
- `diff(other)`: 对比两棵树
- `subscribe(listener)`: 订阅变化

### MemorySystem

- `insert(path, data)`: 插入数据
- `get(path)`: 获取数据
- `update(path, data)`: 更新数据
- `remove(path)`: 删除数据
- `query(hash)`: 按哈希查询
- `queryPath(path)`: 按路径查询
- `queryChanged(since)`: 查询变化
- `queryByPrefix(prefix)`: 前缀查询
- `snapshot()`: 创建快照
- `restore(snapshot)`: 恢复快照

### FileWatcher

- `watch(path, callback, options)`: 监听路径
- `notify(event)`: 通知事件
- `dispose()`: 释放资源
