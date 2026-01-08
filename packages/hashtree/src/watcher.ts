import type { Path, HashTreeChangeEvent, WatchEvent, WatchOptions } from './types.js'
import { MemorySystem } from './memory.js'

export class FileWatcher {
  private listeners: Map<string, Set<(event: WatchEvent) => void>> = new Map()
  private memory: MemorySystem

  constructor(memory: MemorySystem) {
    this.memory = memory
  }

  watch(path: Path, callback: (event: WatchEvent) => void, options: WatchOptions = {}): () => void {
    const pathKey = this.pathToKey(path)

    if (!this.listeners.has(pathKey)) {
      this.listeners.set(pathKey, new Set())
    }

    this.listeners.get(pathKey)!.add(callback)

    const unsubscribe = () => {
      const listeners = this.listeners.get(pathKey)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.listeners.delete(pathKey)
        }
      }
    }

    if (options.signal) {
      options.signal.addEventListener('abort', unsubscribe)
    }

    return unsubscribe
  }

  notify(event: HashTreeChangeEvent): void {
    const eventPath = event.path
    const pathKey = this.pathToKey(eventPath)

    const listeners = this.listeners.get(pathKey)
    if (listeners) {
      const watchEvent: WatchEvent = {
        type: event.type,
        path: event.path,
        timestamp: Date.now()
      }
      listeners.forEach(callback => callback(watchEvent))
    }

    this.notifyParents(eventPath, event)
  }

  private notifyParents(path: Path, event: HashTreeChangeEvent): void {
    const segments = [...path.segments]

    for (let i = segments.length - 1; i >= 0; i--) {
      const parentPath = { segments: segments.slice(0, i) }
      const parentKey = this.pathToKey(parentPath)

      const listeners = this.listeners.get(parentKey)
      if (listeners) {
        const watchEvent: WatchEvent = {
          type: event.type,
          path: event.path,
          timestamp: Date.now()
        }
        listeners.forEach(callback => callback(watchEvent))
      }
    }
  }

  private pathToKey(path: Path): string {
    return path.segments.join('/')
  }

  dispose(): void {
    this.listeners.clear()
  }
}
