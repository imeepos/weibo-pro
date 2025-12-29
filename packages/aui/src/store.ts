import { BehaviorSubject, Observable } from 'rxjs';
import type { AuiNode, AuiContext } from './types';

export interface AuiState {
  nodes: Map<string, AuiNode>;
  rootIds: string[];
}

const initialState: AuiState = {
  nodes: new Map(),
  rootIds: [],
};

export class AuiStore {
  private stateSubject = new BehaviorSubject<AuiState>(initialState);

  get state(): AuiState {
    return this.stateSubject.value;
  }

  get state$(): Observable<AuiState> {
    return this.stateSubject.asObservable();
  }

  registerNode(node: AuiNode, parentId?: string): void {
    const current = this.stateSubject.value;
    const nodes = new Map(current.nodes);
    const isNew = !nodes.has(node.id);
    nodes.set(node.id, node);

    const rootIds = parentId
      ? current.rootIds
      : isNew && !current.rootIds.includes(node.id)
      ? [...current.rootIds, node.id]
      : current.rootIds;

    this.stateSubject.next({ nodes, rootIds });
  }

  unregisterNode(id: string): void {
    const current = this.stateSubject.value;
    const nodes = new Map(current.nodes);
    nodes.delete(id);

    const rootIds = current.rootIds.filter((rootId) => rootId !== id);

    this.stateSubject.next({ nodes, rootIds });
  }

  updateNode(id: string, updates: Partial<AuiNode>): void {
    const current = this.stateSubject.value;
    const node = current.nodes.get(id);
    if (!node) return;

    const nodes = new Map(current.nodes);
    nodes.set(id, { ...node, ...updates });

    this.stateSubject.next({ ...current, nodes });
  }

  getNode(id: string): AuiNode | undefined {
    return this.stateSubject.value.nodes.get(id);
  }

  getRootNodes(): AuiNode[] {
    const { nodes, rootIds } = this.stateSubject.value;
    return rootIds.map((id) => nodes.get(id)).filter(Boolean) as AuiNode[];
  }

  clear(): void {
    this.stateSubject.next(initialState);
  }

  toContext(metadata?: Record<string, unknown>): AuiContext {
    return {
      nodes: this.getRootNodes(),
      timestamp: Date.now(),
      metadata,
    };
  }
}

export const auiStore = new AuiStore();
