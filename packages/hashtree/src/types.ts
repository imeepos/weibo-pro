export type Hash = string

export interface Path {
  readonly segments: readonly string[]
}

export interface HashTreeOptions {
  readonly algorithm?: 'sha256' | 'md5' | 'sha1'
  readonly encoding?: 'hex' | 'base64'
  readonly branchingFactor?: number
}

export interface MemoryIndex {
  hash: Hash
  path: Path
  children: Map<string, MemoryIndex>
  data?: unknown
  lastModified: number
}

export interface HashTreeChangeEvent {
  readonly type: 'add' | 'update' | 'remove'
  readonly path: Path
  readonly oldHash?: Hash
  readonly newHash: Hash
}

export interface WatchEvent {
  readonly type: 'add' | 'update' | 'remove'
  readonly path: Path
  readonly timestamp: number
}

export interface WatchOptions {
  readonly recursive?: boolean
  readonly signal?: AbortSignal
}
