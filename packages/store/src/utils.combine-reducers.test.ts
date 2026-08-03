import { describe, it, expect } from 'vitest'
import { combineReducers } from './utils'
import type { ActionReducer } from './models'

describe('utils combineReducers', () => {
  interface CounterState {
    count: number
  }

  interface UserState {
    name: string
  }

  interface RootState {
    counter: CounterState
    user: UserState
  }

  const counterReducer: ActionReducer<CounterState> = (
    state = { count: 0 },
    action,
  ) => {
    if (action.type === 'INCREMENT') {
      return { count: state.count + 1 }
    }
    if (action.type === 'DECREMENT') {
      return { count: state.count - 1 }
    }
    return state
  }

  const userReducer: ActionReducer<UserState> = (
    state = { name: '' },
    action,
  ) => {
    if (action.type === 'SET_NAME') {
      return { name: (action as any).name }
    }
    return state
  }

  it('合并多个 reducer', () => {
    const rootReducer = combineReducers<RootState>({
      counter: counterReducer,
      user: userReducer,
    })

    const initialState = rootReducer(undefined, { type: '@@INIT' })
    expect(initialState).toEqual({
      counter: { count: 0 },
      user: { name: '' },
    })
  })

  it('派发 action 只更新对应的切片', () => {
    const rootReducer = combineReducers<RootState>({
      counter: counterReducer,
      user: userReducer,
    })

    const state1 = rootReducer(undefined, { type: '@@INIT' })
    const state2 = rootReducer(state1, { type: 'INCREMENT' })

    expect(state2.counter.count).toBe(1)
    expect(state2.user).toBe(state1.user) // 未变化的切片保持引用相等
  })

  it('支持初始状态', () => {
    const rootReducer = combineReducers<RootState>(
      {
        counter: counterReducer,
        user: userReducer,
      },
      {
        counter: { count: 10 },
      },
    )

    const state = rootReducer(undefined, { type: '@@INIT' })
    expect(state.counter.count).toBe(10)
  })

  it('动态移除 reducer 时返回新状态', () => {
    const rootReducer = combineReducers<RootState>({
      counter: counterReducer,
      user: userReducer,
    })

    const state1 = rootReducer(undefined, { type: '@@INIT' })

    // 移除 user reducer
    const reducerAfterRemoval = combineReducers<Partial<RootState>>({
      counter: counterReducer,
    })

    const state2 = reducerAfterRemoval(state1 as any, { type: 'INCREMENT' })
    expect(state2).not.toBe(state1) // 应该返回新状态（hasRemovedReducers）
    expect(state2.counter.count).toBe(1)
    expect(state2.user).toBeUndefined()
  })
})
