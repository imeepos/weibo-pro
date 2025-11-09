import 'reflect-metadata';
export { InjectionToken, type InjectionTokenOptions } from './injection-token';
export {
  HostAttributeToken,
  isHostAttributeToken,
  createHostAttributeToken,
} from './host-attribute-token';
export {
  Injector,
  type InjectionTokenType,
  type Type,
  type AbstractType,
  type StringToken,
  type SymbolToken,
} from './injector';
export { NullInjector } from './null-injector';
export { EnvironmentInjector, root } from './environment-injector';
export {
  type Provider,
  type BaseProvider,
  type ValueProvider,
  type ClassProvider,
  type FactoryProvider,
  type ExistingProvider,
  type ConstructorProvider,
  type LazyClassProvider,
  type LazyFactoryProvider,
} from './provider';
export {
  Injectable,
  type InjectableOptions,
  type InjectableMetadata,
  type InjectorScope,
  getInjectableMetadata,
  isInjectable,
} from './injectable';
export {
  Inject,
  type InjectMetadata,
  getInjectMetadata,
  getInjectOptionsMetadata,
  getUnifiedInjectMetadata,
  hasInjectMetadata,
} from './inject';
export { Optional, Self, SkipSelf, Host } from './parameter-decorators';
export { type InjectOptions } from './inject-options';
export {
  InternalInjectFlags,
  combineInjectFlags,
  hasFlag,
  convertInjectOptionsToFlags,
  convertFlagsToInjectOptions,
  validateInjectOptionsConflicts,
  flagsToString,
} from './internal-inject-flags';
export { type OnDestroy, isOnDestroy } from './lifecycle';
export { OnInit, hasOnInitMetadata, isOnInit } from './on-init';
export {
  forwardRef,
  ForwardRef,
  isForwardRef,
  resolveForwardRef,
} from './forward-ref';
export {
  APP_INITIALIZER,
  type Initializer,
} from './app-initializer';


export { NoRetryError } from './errors';
export * from './root'