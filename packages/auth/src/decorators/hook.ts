import { root } from '@sker/core';
import { AUTH_HOOK } from '../core/tokens';
import { resolveConstructor } from '../core/utils';
import type { HookTiming, HookMatcher, HookOptions } from '../core/types';

/**
 * 创建 Hook 装饰器的工厂函数
 */
function createHookDecorator(timing: HookTiming, matcher: HookMatcher): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const ctor = resolveConstructor(target);

    root.set([{
      provide: AUTH_HOOK,
      multi: true,
      useValue: {
        target: ctor,
        propertyKey,
        timing,
        matcher
      }
    }]);

    return descriptor;
  };
}

/**
 * @AfterSignUp 装饰器 - 用户注册后钩子
 */
export function AfterSignUp(): MethodDecorator {
  return createHookDecorator('after', '/sign-up/email');
}

/**
 * @BeforeSignUp 装饰器 - 用户注册前钩子
 */
export function BeforeSignUp(): MethodDecorator {
  return createHookDecorator('before', '/sign-up/email');
}

/**
 * @AfterSignIn 装饰器 - 用户登录后钩子
 */
export function AfterSignIn(): MethodDecorator {
  return createHookDecorator('after', (ctx) => ctx.path.includes('/sign-in'));
}

/**
 * @BeforeSignIn 装饰器 - 用户登录前钩子
 */
export function BeforeSignIn(): MethodDecorator {
  return createHookDecorator('before', (ctx) => ctx.path.includes('/sign-in'));
}

/**
 * @BeforeHook 装饰器 - 通用前置钩子
 */
export function BeforeHook(options: HookOptions): MethodDecorator {
  return createHookDecorator('before', options.matcher);
}

/**
 * @AfterHook 装饰器 - 通用后置钩子
 */
export function AfterHook(options: HookOptions): MethodDecorator {
  return createHookDecorator('after', options.matcher);
}
