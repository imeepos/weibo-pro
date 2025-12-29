import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { auiStore, type AuiStore } from './store';
import { contextSerializer, AuiContextSerializer } from './serializer';
import type { AuiNode, AuiMetadata } from './types';

interface AuiContextValue {
  store: AuiStore;
  serializer: AuiContextSerializer;
}

const AuiContext = createContext<AuiContextValue | null>(null);

export interface AuiProviderProps {
  children: ReactNode;
  store?: AuiStore;
  serializer?: AuiContextSerializer;
}

export function AuiProvider({
  children,
  store = auiStore,
  serializer = contextSerializer,
}: AuiProviderProps) {
  const value = useMemo(() => ({ store, serializer }), [store, serializer]);

  return <AuiContext.Provider value={value}>{children}</AuiContext.Provider>;
}

export function useAui(): AuiContextValue {
  const context = useContext(AuiContext);
  if (!context) {
    throw new Error('useAui must be used within AuiProvider');
  }
  return context;
}

export function useAuiNode(
  id: string,
  type: string,
  props?: Record<string, unknown>,
  metadata?: AuiMetadata
): void {
  const { store } = useAui();

  useEffect(() => {
    const node: AuiNode = { id, type, props, metadata };
    store.registerNode(node);

    return () => {
      store.unregisterNode(id);
    };
  }, [id, type, store, JSON.stringify(props), JSON.stringify(metadata)]);
}

export function useAuiContext(metadata?: Record<string, unknown>): string {
  const { store, serializer } = useAui();
  const nodes = store.getRootNodes();
  return serializer.serializeContext(nodes, metadata);
}

export function useAuiNaturalContext(pageName?: string): string {
  const { store, serializer } = useAui();
  const nodes = store.getRootNodes();
  return serializer.toNaturalLanguage(nodes, pageName);
}
