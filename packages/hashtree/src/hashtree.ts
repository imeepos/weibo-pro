import { createHash } from 'crypto'
import type { Hash, HashTreeOptions, Path, HashTreeChangeEvent } from './types.js'

function computeHash(data: unknown): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  return createHash('sha256').update(str).digest('hex')
}

export class HashTreeNode {
  constructor(
    public readonly hash: Hash,
    public readonly path: Path,
    public readonly children: Map<string, HashTreeNode>,
    public readonly data?: unknown
  ) {}

  static leaf(path: Path, data: unknown): HashTreeNode {
    const hash = computeHash(data)
    return new HashTreeNode(hash, path, new Map(), data)
  }

  static internal(children: Map<string, HashTreeNode>, path: Path): HashTreeNode {
    const combinedHashes = Array.from(children.values())
      .map(n => n.hash)
      .sort()
      .join('')
    const hash = computeHash(combinedHashes)
    return new HashTreeNode(hash, path, children)
  }

  isLeaf(): boolean {
    return this.children.size === 0
  }
}

export class HashTree {
  private root: HashTreeNode
  private listeners: Set<(event: HashTreeChangeEvent) => void> = new Set()

  constructor(
    private readonly options: HashTreeOptions = {}
  ) {
    this.root = new HashTreeNode(
      computeHash(''),
      { segments: [] },
      new Map()
    )
  }

  insert(path: Path, data: unknown): void {
    const oldHash = this.get(path)?.hash
    this.root = this.insertNode(this.root, path, data)

    this.listeners.forEach(listener => listener({
      type: oldHash ? 'update' : 'add',
      path,
      oldHash,
      newHash: computeHash(data)
    }))
  }

  private insertNode(node: HashTreeNode, path: Path, data: unknown): HashTreeNode {
    if (path.segments.length === 0) {
      return HashTreeNode.leaf(path, data)
    }

    const [head, ...tail] = path.segments
    if (!head) return node
    const childPath = { segments: tail }

    const newChildren = new Map(node.children)
    const existingChild = newChildren.get(head)

    if (existingChild) {
      newChildren.set(head, this.insertNode(existingChild, childPath, data))
    } else {
      newChildren.set(head, HashTreeNode.leaf(childPath, data))
    }

    return HashTreeNode.internal(newChildren, node.path)
  }

  get(path: Path): HashTreeNode | undefined {
    return this.getNode(this.root, path)
  }

  private getNode(node: HashTreeNode, path: Path): HashTreeNode | undefined {
    if (path.segments.length === 0) {
      return node
    }

    const [head, ...tail] = path.segments
    if (!head) return undefined
    const child = node.children.get(head)

    if (!child) {
      return undefined
    }

    return this.getNode(child, { segments: tail })
  }

  remove(path: Path): void {
    const existing = this.get(path)
    if (!existing) return

    this.root = this.removeNode(this.root, path)

    this.listeners.forEach(listener => listener({
      type: 'remove',
      path,
      oldHash: existing.hash,
      newHash: this.root.hash
    }))
  }

  private removeNode(node: HashTreeNode, path: Path): HashTreeNode {
    if (path.segments.length === 0) {
      return node
    }

    const [head, ...tail] = path.segments
    if (!head) return node
    const newChildren = new Map(node.children)
    const child = newChildren.get(head)

    if (!child) {
      return node
    }

    if (tail.length === 0) {
      newChildren.delete(head)
    } else {
      const updatedChild = this.removeNode(child, { segments: tail })
      newChildren.set(head, updatedChild)
    }

    return HashTreeNode.internal(newChildren, node.path)
  }

  getRootHash(): Hash {
    return this.root.hash
  }

  subscribe(listener: (event: HashTreeChangeEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  diff(other: HashTree): Path[] {
    return this.diffNodes(this.root, other.root, { segments: [] })
  }

  private diffNodes(
    a: HashTreeNode,
    b: HashTreeNode,
    currentPath: Path
  ): Path[] {
    if (a.hash === b.hash) {
      return []
    }

    if (a.isLeaf() || b.isLeaf()) {
      return [currentPath]
    }

    const allKeys = new Set([
      ...a.children.keys(),
      ...b.children.keys()
    ])

    const differences: Path[] = []

    for (const key of allKeys) {
      const childA = a.children.get(key)
      const childB = b.children.get(key)

      if (!childA || !childB) {
        differences.push({ segments: [...currentPath.segments, key] })
      } else {
        differences.push(
          ...this.diffNodes(
            childA,
            childB,
            { segments: [...currentPath.segments, key] }
          )
        )
      }
    }

    return differences
  }
}

export function path(...segments: string[]): Path {
  return { segments }
}
