import { describe, it, expect } from 'vitest'
import { HashTree, path } from './hashtree.js'
import { MemorySystem } from './memory.js'
import { FileWatcher } from './watcher.js'

describe('HashTree', () => {
  it('should create empty tree', () => {
    const tree = new HashTree()
    expect(tree.getRootHash()).toBeDefined()
  })

  it('should insert and retrieve data', () => {
    const tree = new HashTree()
    const filePath = path('src', 'index.ts')

    tree.insert(filePath, 'const x = 1')
    const node = tree.get(filePath)

    expect(node).toBeDefined()
    expect(node?.data).toBe('const x = 1')
  })

  it('should detect data changes', () => {
    const tree = new HashTree()
    const filePath = path('src', 'index.ts')

    tree.insert(filePath, 'const x = 1')
    const oldHash = tree.get(filePath)?.hash

    tree.insert(filePath, 'const x = 2')
    const newHash = tree.get(filePath)?.hash

    expect(oldHash).not.toBe(newHash)
  })

  it('should diff two trees', () => {
    const tree1 = new HashTree()
    const tree2 = new HashTree()

    tree1.insert(path('a.txt'), 'content1')
    tree2.insert(path('a.txt'), 'content2')

    const diff = tree1.diff(tree2)
    expect(diff).toHaveLength(1)
    expect(diff[0]).toEqual({ segments: ['a.txt'] })
  })

  it('should notify subscribers on change', () => {
    const tree = new HashTree()
    const filePath = path('src', 'index.ts')

    let notified = false
    tree.subscribe(() => { notified = true })

    tree.insert(filePath, 'content')
    expect(notified).toBe(true)
  })

  it('should support nested paths', () => {
    const tree = new HashTree()

    tree.insert(path('src', 'components', 'Button.tsx'), 'button code')
    tree.insert(path('src', 'utils', 'helpers.ts'), 'helper code')

    expect(tree.get(path('src', 'components', 'Button.tsx'))?.data).toBe('button code')
    expect(tree.get(path('src', 'utils', 'helpers.ts'))?.data).toBe('helper code')
  })

  it('should remove data', () => {
    const tree = new HashTree()
    const filePath = path('src', 'index.ts')

    tree.insert(filePath, 'content')
    expect(tree.get(filePath)).toBeDefined()

    tree.remove(filePath)
    expect(tree.get(filePath)).toBeUndefined()
  })
})

describe('MemorySystem', () => {
  it('should maintain memory index', () => {
    const memory = new MemorySystem()
    const filePath = path('src', 'index.ts')

    memory.insert(filePath, 'content')

    const index = memory.queryPath(filePath)
    expect(index).toBeDefined()
    expect(index?.hash).toBeDefined()
  })

  it('should query by hash', () => {
    const memory = new MemorySystem()
    const content = 'same content'

    memory.insert(path('a.txt'), content)
    memory.insert(path('b.txt'), content)

    const results = memory.query('hash')
    expect(results.length).toBeGreaterThan(0)
  })

  it('should query changed data since timestamp', () => {
    const memory = new MemorySystem()
    const before = Date.now()

    memory.insert(path('a.txt'), 'content')

    const changed = memory.queryChanged(before)
    expect(changed).toHaveLength(1)
  })

  it('should query by prefix', () => {
    const memory = new MemorySystem()

    memory.insert(path('src', 'a.ts'), 'content1')
    memory.insert(path('src', 'b.ts'), 'content2')
    memory.insert(path('test', 'c.ts'), 'content3')

    const results = memory.queryByPrefix(['src'])
    expect(results.length).toBe(3)
  })

  it('should create and restore snapshot', () => {
    const memory = new MemorySystem()

    memory.insert(path('a.txt'), 'content1')
    memory.insert(path('b.txt'), 'content2')

    const snapshot = memory.snapshot()
    const rootHash = memory.getRootHash()

    memory.insert(path('c.txt'), 'content3')
    expect(memory.getRootHash()).not.toBe(rootHash)

    memory.restore(snapshot)
    expect(memory.getRootHash()).toBe(rootHash)
  })

  it('should update existing data', () => {
    const memory = new MemorySystem()
    const filePath = path('src', 'index.ts')

    memory.insert(filePath, 'old content')
    const oldHash = memory.queryPath(filePath)?.hash

    memory.insert(filePath, 'new content')
    const newHash = memory.queryPath(filePath)?.hash

    expect(oldHash).not.toBe(newHash)
  })
})

describe('FileWatcher', () => {
  it('should notify on path change', () => {
    const memory = new MemorySystem()
    const watcher = new FileWatcher(memory)
    const filePath = path('src', 'index.ts')

    let notified = false
    watcher.watch(filePath, () => { notified = true })

    memory.insert(filePath, 'content')
    expect(notified).toBe(true)
  })

  it('should support unsubscribe', () => {
    const memory = new MemorySystem()
    const watcher = new FileWatcher(memory)
    const filePath = path('src', 'index.ts')

    let callCount = 0
    const unsubscribe = watcher.watch(filePath, () => { callCount++ })

    memory.insert(filePath, 'content1')
    unsubscribe()
    memory.insert(filePath, 'content2')

    expect(callCount).toBe(1)
  })

  it('should notify parent paths', () => {
    const memory = new MemorySystem()
    const watcher = new FileWatcher(memory)
    const parentPath = path('src')
    const filePath = path('src', 'index.ts')

    let notified = false
    watcher.watch(parentPath, () => { notified = true })

    memory.insert(filePath, 'content')
    expect(notified).toBe(true)
  })
})
