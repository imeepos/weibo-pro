import {
  BehaviorSubject,
  Observable,
  queueScheduler,
  Subscription,
} from 'rxjs';
import { observeOn, scan, withLatestFrom } from 'rxjs/operators';
import { ActionsSubject, INIT } from './actions-subject';
import type { Action, ActionReducer } from './models';
import { ReducerObservable } from './reducer-manager';

/**
 * StateObservable - 状态流的抽象类型
 */
export abstract class StateObservable extends Observable<any> {}

/**
 * StateActionPair - 状态与 Action 的配对类型
 */
export interface StateActionPair<T, V extends Action = Action> {
  state: T | undefined;
  action?: V;
}

/**
 * reduceState - 状态缩减函数
 *
 * 接收当前状态和 [Action, Reducer] 元组，返回新状态
 */
export function reduceState<T, V extends Action = Action>(
  stateActionPair: StateActionPair<T, V> = { state: undefined },
  [action, reducer]: [V, ActionReducer<T, V>]
): StateActionPair<T, V> {
  const { state } = stateActionPair;
  return { state: reducer(state, action), action };
}

/**
 * ScannedActionsSubject - 处理后的 Action 流
 *
 * 用于发布经过 reducer 处理后的 action（用于调试、日志等）
 */
export class ScannedActionsSubject extends BehaviorSubject<Action> {
  constructor() {
    super({ type: INIT });
  }

  override complete(): void {
    // 防止外部意外完成流
  }

  destroy(): void {
    super.complete();
  }
}

/**
 * State - 状态管理类
 *
 * 基于 BehaviorSubject，订阅 ActionsSubject 和 ReducerObservable，
 * 使用 scan operator 累积状态变更。
 */
export class State<T = any> extends BehaviorSubject<T> {
  static readonly INIT = INIT;

  private stateSubscription: Subscription;

  constructor(
    actions$: ActionsSubject,
    reducer$: ReducerObservable,
    private scannedActions: ScannedActionsSubject,
    initialState: T
  ) {
    super(initialState);

    // Action 流放入队列调度器（确保异步执行）
    const actionsOnQueue$ = actions$.pipe(observeOn(queueScheduler));

    // 合并最新的 Reducer
    const withLatestReducer$ = actionsOnQueue$.pipe(
      withLatestFrom(reducer$)
    ) as Observable<[Action, ActionReducer<T, Action>]>;

    // 使用 scan 累积状态
    const seed: StateActionPair<T> = { state: initialState };
    const stateAndAction$ = withLatestReducer$.pipe(
      scan<[Action, ActionReducer<T, Action>], StateActionPair<T>>(
        reduceState,
        seed
      )
    );

    // 订阅状态流，发布新状态
    this.stateSubscription = stateAndAction$.subscribe(({ state, action }) => {
      this.next(state!);
      scannedActions.next(action!);
    });
  }

  /**
   * 销毁状态流
   */
  destroy(): void {
    this.stateSubscription.unsubscribe();
    this.complete();
  }
}
