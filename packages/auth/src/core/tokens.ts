import { InjectionToken } from '@sker/core';
import type {
  PluginMetadata,
  EntityMetadata,
  FieldMetadata,
  EndpointMetadata,
  ParameterMetadata,
  HookMetadata,
  RateLimitMetadata
} from './types';

export const AUTH_PLUGIN = new InjectionToken<PluginMetadata[]>('AUTH_PLUGIN');
export const AUTH_ENTITY = new InjectionToken<EntityMetadata[]>('AUTH_ENTITY');
export const AUTH_FIELD = new InjectionToken<FieldMetadata[]>('AUTH_FIELD');
export const AUTH_ENDPOINT = new InjectionToken<EndpointMetadata[]>('AUTH_ENDPOINT');
export const AUTH_PARAMETER = new InjectionToken<ParameterMetadata[]>('AUTH_PARAMETER');
export const AUTH_HOOK = new InjectionToken<HookMetadata[]>('AUTH_HOOK');
export const AUTH_RATE_LIMIT = new InjectionToken<RateLimitMetadata[]>('AUTH_RATE_LIMIT');
