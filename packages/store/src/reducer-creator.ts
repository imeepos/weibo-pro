import { ActionCreator, ActionReducer, ActionType, Action } from './models';

type ExtractActionTypes<Creators extends readonly ActionCreator[]> = {
  [Key in keyof Creators]: Creators[Key] extends ActionCreator<infer T>
    ? T
    : never;
};

/**
 * `on` 函数返回类型：包含 reducer 和对应的 action 类型
 */
export interface ReducerTypes<
  State,
  Creators extends readonly ActionCreator[],
> {
  reducer: OnReducer<State, Creators>;
  types: ExtractActionTypes<Creators>;
}

/**
 * 感知 Action 类型的 Reducer
 */
export interface OnReducer<
  State,
  Creators extends readonly ActionCreator[],
  InferredState = State,
  ResultState = unknown extends State ? InferredState : State,
> {
  (
    state: unknown extends State ? InferredState : State,
    action: ActionType<Creators[number]>
  ): ResultState;
}

/**
 * 关联 Action 与状态变化函数
 *
 * @example
 * ```ts
 * on(increment, (state) => ({ ...state, count: state.count + 1 }))
 * on(loginSuccess, (state, { user }) => ({ ...state, user }))
 * ```
 */
export function on<
  State,
  Creators extends readonly ActionCreator[],
  InferredState = State,
>(
  ...args: [
    ...creators: Creators,
    reducer: OnReducer<
      State extends infer S ? S : never,
      Creators,
      InferredState
    >,
  ]
): ReducerTypes<unknown extends State ? InferredState : State, Creators> {
  const reducer = args.pop() as unknown as OnReducer<
    unknown extends State ? InferredState : State,
    Creators
  >;
  const types = (args as unknown as Creators).map(
    (creator) => creator.type
  ) as unknown as ExtractActionTypes<Creators>;
  return { reducer, types };
}

/**
 * 创建 Reducer 函数
 *
 * @example
 * ```ts
 * const counterReducer = createReducer(
 *   { count: 0 },
 *   on(increment, (state) => ({ count: state.count + 1 })),
 *   on(decrement, (state) => ({ count: state.count - 1 })),
 *   on(reset, () => ({ count: 0 }))
 * );
 * ```
 */
export function createReducer<
  S,
  A extends Action = Action,
  R extends ActionReducer<S, A> = ActionReducer<S, A>,
>(initialState: S, ...ons: ReducerTypes<S, readonly ActionCreator[]>[]): R {
  const map = new Map<string, OnReducer<S, ActionCreator[]>>();
  for (const on of ons) {
    for (const type of on.types) {
      const existingReducer = map.get(type);
      if (existingReducer) {
        // 支持多个 on() 绑定同一个 action（链式调用）
        const newReducer: typeof existingReducer = (state, action) =>
          on.reducer(existingReducer(state, action), action);
        map.set(type, newReducer);
      } else {
        map.set(type, on.reducer);
      }
    }
  }

  return function (state: S = initialState, action: A): S {
    const reducer = map.get(action.type);
    return reducer ? reducer(state, action) : state;
  } as R;
}
