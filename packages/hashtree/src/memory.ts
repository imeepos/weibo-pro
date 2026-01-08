import type { MemoryIndex, Path, Hash, HashTreeChangeEvent } from './types.js'
import { HashTree, path } from './hashtree.js'

export class MemorySystem {
  private index: MemoryIndex
  private tree: HashTree
  private pathIndex: Map<string, MemoryIndex>

  constructor() {
    this.tree = new HashTree()
    this.index = this.createRootIndex()
    this.pathIndex = new Map()

    this.tree.subscribe((event: HashTreeChangeEvent) => this.onTreeChange(event))
  }

  private createRootIndex(): MemoryIndex {
    return {
      hash: this.tree.getRootHash(),
      path: { segments: [] },
      children: new Map(),
      lastModified: Date.now()
    }
  }

  private onTreeChange(event: HashTreeChangeEvent): void {
    this.updateIndex(event)
  }

  private updateIndex(event: HashTreeChangeEvent): void {
    const { path: eventPath, newHash } = event
    const pathKey = this.pathToKey(eventPath)

    let currentIndex = this.index

    for (const segment of eventPath.segments) {
      if (!currentIndex.children.has(segment)) {
        currentIndex.children.set(segment, {
          hash: '',
          path: { segments: [] },
          children: new Map(),
          lastModified: Date.now()
        })
      }
      currentIndex = currentIndex.children.get(segment)!
    }

    currentIndex.hash = newHash
    currentIndex.lastModified = Date.now()

    this.pathIndex.set(pathKey, currentIndex)

    this.rebuildParentHashes(eventPath)
  }

  private rebuildParentHashes(path: Path): void {
    const segments = [...path.segments]
    let currentIndex = this.index

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      if (!segment) break
      const child = currentIndex.children.get(segment)
      if (!child) break

      const childHashes = Array.from(child.children.values())
        .map((c: MemoryIndex) => c.hash)
        .sort()
        .join('')

      child.hash = this.computeHash(childHashes || child.hash)
      currentIndex = child
    }

    const rootChildHashes = Array.from(this.index.children.values())
      .map((c: MemoryIndex) => c.hash)
      .sort()
      .join('')
    this.index.hash = this.computeHash(rootChildHashes || this.index.hash)
  }

  private computeHash(data: string): string {
    return Array.from(data).reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0) || 0
    }, 0).toString(36)
  }

  private pathToKey(path: Path): string {
    return path.segments.join('/')
  }

  insert(path: Path, data: unknown): void {
    this.tree.insert(path, data)
  }

  get(path: Path): unknown | undefined {
    const node = this.tree.get(path)
    return node?.data
  }

  update(path: Path, data: unknown): void {
    const existing = this.tree.get(path)
    if (!existing) {
      throw new Error(`Path not found: ${this.pathToKey(path)}`)
    }

    const newHash = this.computeHash(JSON.stringify(data))
    if (existing.hash === newHash) {
      return
    }

    this.tree.insert(path, data)
  }

  remove(path: Path): void {
    this.tree.remove(path)
    const pathKey = this.pathToKey(path)
    this.pathIndex.delete(pathKey)
  }

  query(hash: Hash): MemoryIndex[] {
    const results: MemoryIndex[] = []

    const traverse = (index: MemoryIndex) => {
      if (index.hash === hash) {
        results.push(index)
      }

      for (const child of index.children.values()) {
        traverse(child)
      }
    }

    traverse(this.index)
    return results
  }

  queryPath(path: Path): MemoryIndex | undefined {
    let current = this.index

    for (const segment of path.segments) {
      const child = current.children.get(segment)
      if (!child) {
        return undefined
      }
      current = child
    }

    return current
  }

  queryChanged(since: number): Path[] {
    const changed: Path[] = []

    const traverse = (index: MemoryIndex, currentPath: string[]) => {
      if (index.lastModified > since) {
        changed.push({ segments: [...currentPath] })
      }

      for (const [segment, child] of index.children.entries()) {
        traverse(child, [...currentPath, segment])
      }
    }

    traverse(this.index, [])
    return changed
  }

  queryByPrefix(prefix: string[]): MemoryIndex[] {
    let current = this.index

    for (const segment of prefix) {
      const child = current.children.get(segment)
      if (!child) {
        return []
      }
      current = child
    }

    const results: MemoryIndex[] = []

    const traverse = (index: MemoryIndex) => {
      results.push(index)
      for (const child of index.children.values()) {
        traverse(child)
      }
    }

    traverse(current)
    return results
  }

  diff(other: HashTree): Path[] {
    return this.tree.diff(other)
  }

  getRootHash(): Hash {
    return this.index.hash
  }

  snapshot(): MemoryIndex {
    return this.deepClone(this.index)
  }

  private deepClone(index: MemoryIndex): MemoryIndex {
    return {
      hash: index.hash,
      path: { ...index.path, segments: [...index.path.segments] },
      children: new Map(
        Array.from(index.children.entries()).map(([key, value]: [string, MemoryIndex]) => [
          key,
          this.deepClone(value)
        ])
      ),
      data: index.data,
      lastModified: index.lastModified
    }
  }

  restore(snapshot: MemoryIndex): void {
    this.index = this.deepClone(snapshot)
    this.pathIndex.clear()

    const rebuildPathIndex = (index: MemoryIndex, pathStr: string) => {
      this.pathIndex.set(pathStr, index)
      for (const [segment, child] of index.children.entries()) {
        const childPath = pathStr ? `${pathStr}/${segment}` : segment
        rebuildPathIndex(child, childPath)
      }
    }

    rebuildPathIndex(this.index, '')
  }
}
