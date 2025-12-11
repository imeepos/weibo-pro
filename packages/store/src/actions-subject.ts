import { BehaviorSubject } from 'rxjs';
import type { Action } from './models';

export const INIT = '@sker/store/init' as const;

/**
 * ActionsSubject - Action 流管理
 *
 * 基于 BehaviorSubject，负责 Action 的派发与订阅。
 * 提供类型校验，确保派发的 Action 符合规范。
 */
export class ActionsSubject extends BehaviorSubject<Action> {
  constructor() {
    super({ type: INIT });
  }

  override next(action: Action): void {
    if (typeof action === 'function') {
      throw new TypeError(
        `Dispatch expected an object, instead it received a function. ` +
        `If you're using the createAction function, make sure to invoke the function ` +
        `before dispatching the action. For example, someAction should be someAction().`
      );
    }

    if (typeof action === 'undefined') {
      throw new TypeError(`Actions must be objects`);
    }

    if (typeof action.type === 'undefined') {
      throw new TypeError(`Actions must have a type property`);
    }

    super.next(action);
  }

  override complete(): void {
    // 防止外部意外完成流
  }

  /**
   * 销毁时调用，完成 Observable
   */
  destroy(): void {
    super.complete();
  }
}
