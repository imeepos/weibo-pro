import 'reflect-metadata';
import type { BetterAuthPlugin } from 'better-auth';
import { controllerFactory } from './factory';
import { CONTROLLES, Provider, root } from '@sker/core';

export function createSkerAuthPlugin(
  providers: Provider[],
  options?: { id?: string }
): BetterAuthPlugin {
  const pluginId = options?.id || 'controllers';
  const endpoints: Record<string, any> = {};

  root.set([...providers]);

  const controllers = root.get(CONTROLLES, []);

  for (const ControllerClass of controllers) {
    const controllerEndpoints = controllerFactory(ControllerClass);
    Object.assign(endpoints, controllerEndpoints);
  }

  return {
    id: pluginId,
    endpoints,
  };
}
