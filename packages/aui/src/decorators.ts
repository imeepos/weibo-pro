import type { ComponentType } from 'react';
import type { AuiSerializer, AuiNode, AuiMetadata } from './types';
import { contextSerializer } from './serializer';

export interface AuiDecoratorOptions {
  type: string;
  serializer?: AuiSerializer;
  metadata?: AuiMetadata;
}

export function withAui<P extends object>(
  Component: ComponentType<P>,
  options: AuiDecoratorOptions
): ComponentType<P> {
  if (options.serializer) {
    contextSerializer.register(options.type, options.serializer);
  }

  return Component;
}

export function createAuiSerializer<T>(
  serialize: (value: T) => AuiNode | null,
  deserialize?: (node: AuiNode) => T | null
): AuiSerializer<T> {
  return { serialize, deserialize };
}
