import type { Type } from '@sker/core';

export interface PluginMetadata {
  id: string;
  description?: string;
  target: Type<any>;
}

export interface EntityMetadata {
  tableName: string;
  extendUser?: boolean;
  target: Type<any>;
}

export type FieldType = 'string' | 'number' | 'boolean' | 'date';

export interface FieldOptions {
  type: FieldType;
  required?: boolean;
  references?: {
    model: string;
    field: string;
  };
  defaultValue?: any;
  unique?: boolean;
}

export interface FieldMetadata extends FieldOptions {
  target: Type<any>;
  propertyKey: string | symbol;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface EndpointOptions {
  requireAuth?: boolean;
  rateLimit?: {
    window: number;
    max: number;
  };
}

export interface EndpointMetadata extends EndpointOptions {
  target: Type<any>;
  propertyKey: string | symbol;
  method: HttpMethod;
  path: string;
}

export type ParameterType = 'body' | 'context' | 'query' | 'param';

export interface ParameterMetadata {
  target: Type<any>;
  propertyKey: string | symbol;
  parameterIndex: number;
  type: ParameterType;
  schema?: any;
  paramName?: string;
}

export type HookTiming = 'before' | 'after';
export type HookMatcher = string | ((context: any) => boolean);

export interface HookOptions {
  matcher: HookMatcher;
}

export interface HookMetadata {
  target: Type<any>;
  propertyKey: string | symbol;
  timing: HookTiming;
  matcher: HookMatcher;
}

export type PathMatcher = string | ((path: string) => boolean);

export interface RateLimitOptions {
  pathMatcher: PathMatcher;
  window: number;
  max: number;
}

export interface RateLimitMetadata extends RateLimitOptions {
  target: Type<any>;
  propertyKey?: string | symbol;
}
