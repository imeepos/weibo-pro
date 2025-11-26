import type { BetterAuthClientPlugin } from 'better-auth/client';
import type { BirthdayPlugin } from './birthday.plugin';

/**
 * Birthday Client Plugin
 * 客户端类型推断插件
 */
export const birthdayClient = () => {
  return {
    id: 'birthday',
    $InferServerPlugin: {} as ReturnType<typeof BirthdayPlugin>
  } satisfies BetterAuthClientPlugin;
};
