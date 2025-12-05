import { BehaviorSubject } from 'rxjs'
import type { WorkflowNode, WorkflowEdge } from '../types'

interface WorkflowSnapshot {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

class HistoryManager {
  private history: WorkflowSnapshot[] = []
  private currentIndex = -1
  private maxSize = 50

  readonly canUndo$ = new BehaviorSubject(false)
  readonly canRedo$ = new BehaviorSubject(false)

  push(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.history = this.history.slice(0, this.currentIndex + 1)

    this.history.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    })

    if (this.history.length > this.maxSize) {
      this.history.shift()
    } else {
      this.currentIndex++
    }

    this.updateFlags()
  }

  undo(): WorkflowSnapshot | null {
    if (this.currentIndex <= 0) return null

    this.currentIndex--
    this.updateFlags()
    return structuredClone(this.history[this.currentIndex]) ?? null
  }

  redo(): WorkflowSnapshot | null {
    if (this.currentIndex >= this.history.length - 1) return null

    this.currentIndex++
    this.updateFlags()
    return structuredClone(this.history[this.currentIndex]) ?? null
  }

  clear() {
    this.history = []
    this.currentIndex = -1
    this.updateFlags()
  }

  private updateFlags() {
    this.canUndo$.next(this.currentIndex > 0)
    this.canRedo$.next(this.currentIndex < this.history.length - 1)
  }
}

export const historyManager = new HistoryManager()
