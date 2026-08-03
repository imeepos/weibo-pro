import { describe, it, expect } from 'vitest'
import { combineReducers, createReducerFactory, createFeatureReducerFactory } from './utils'
import type { Action, ActionReducer } from './models'

describe('utils createReducerFactory', () => {
  interface AppState {
    counter: { count: number }
  }

  it('创建基础 reducer 工厂', () => {
    const reducerFactory = createReducerFactory<AppState>(
      (reducerMap) => combineReducers(reducerMap),
    )

    const counterReducer: ActionReducer<{ count: number }> = (
      state = { count: 0 },
      action,
    ) => {
      if (action.type === 'INCREMENT') return { count: state.count + 1 }
      return state
    }

    const rootReducer = reducerFactory({
      counter: counterReducer,
    })

    const state1 = rootReducer(undefined, { type: '@@INIT' })
    const state2 = rootReducer(state1, { type: 'INCREMENT' })

    expect(state2.counter.count).toBe(1)
  })

  it('应用 MetaReducers', () => {
    const logActions: any[] = []
    const loggerMetaReducer =
      (reducer: ActionReducer<AppState>) =>
      (state: AppState | undefined, action: Action) => {
        logActions.push(action.type)
        return reducer(state, action)
      }

    const reducerFactory = createReducerFactory<AppState>(
      (reducerMap) => combineReducers(reducerMap),
      [loggerMetaReducer],
    )

    const counterReducer: ActionReducer<{ count: number }> = (
      state = { count: 0 },
      action,
    ) => {
      if (action.type === 'INCREMENT') return { count: state.count + 1 }
      return state
    }

    const rootReducer = reducerFactory({
      counter: counterReducer,
    })

    rootReducer(undefined, { type: '@@INIT' })
    rootReducer(undefined, { type: 'INCREMENT' })

    expect(logActions).toContain('@@INIT')
    expect(logActions).toContain('INCREMENT')
  })

  it('支持初始状态', () => {
    const reducerFactory = createReducerFactory<AppState>(
      (reducerMap) => combineReducers(reducerMap),
    )

    const counterReducer: ActionReducer<{ count: number }> = (
      state = { count: 0 },
      _action,
    ) => state

    const rootReducer = reducerFactory(
      { counter: counterReducer },
      { counter: { count: 100 } },
    )

    const state = rootReducer(undefined, { type: '@@INIT' })
    expect(state.counter.count).toBe(100)
  })
})

describe('utils createFeatureReducerFactory', () => {
  interface FeatureState {
    value: number
  }

  const featureReducer: ActionReducer<FeatureState> = (
    state = { value: 0 },
    action,
  ) => {
    if (action.type === 'SET_VALUE') {
      return { value: (action as any).value }
    }
    return state
  }

  it('创建 Feature reducer 工厂', () => {
    const factory = createFeatureReducerFactory<FeatureState>()
    const reducer = factory(featureReducer)

    const state1 = reducer(undefined, { type: '@@INIT' })
    const state2 = reducer(state1, { type: 'SET_VALUE', value: 42 } as any)

    expect(state2.value).toBe(42)
  })

  it('应用 MetaReducers 到 Feature reducer', () => {
    const logActions: string[] = []
    const loggerMetaReducer =
      (reducer: ActionReducer<FeatureState>) =>
      (state: FeatureState | undefined, action: Action) => {
        logActions.push(action.type)
        return reducer(state, action)
      }

    const factory = createFeatureReducerFactory<FeatureState>([
      loggerMetaReducer,
    ])
    const reducer = factory(featureReducer)

    reducer(undefined, { type: '@@INIT' })
    reducer(undefined, { type: 'SET_VALUE', value: 42 } as any)

    expect(logActions).toContain('@@INIT')
    expect(logActions).toContain('SET_VALUE')
  })

  it('支持初始状态', () => {
    const factory = createFeatureReducerFactory<FeatureState>()
    const reducer = factory(featureReducer, { value: 999 })

    const state = reducer(undefined, { type: '@@INIT' })
    expect(state.value).toBe(999)
  })

  it('没有 MetaReducers 时直接使用 reducer', () => {
    const factory = createFeatureReducerFactory<FeatureState>([])
    const reducer = factory(featureReducer)

    const state = reducer(undefined, { type: '@@INIT' })
    expect(state.value).toBe(0)
  })
})
