import { describe, it, expect } from 'vitest'
import {
  isObject,
  isPlainObject,
  combineReducers,
  omit,
  compose,
  createReducerFactory,
  createFeatureReducerFactory,
} from './utils'
import type { Action, ActionReducer } from './models'

describe('utils', () => {
  describe('isObject', () => {
    it('识别纯对象', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ a: 1 })).toBe(true)
      expect(isObject(Object.create(null))).toBe(true)
    })

    it('识别类实例为对象', () => {
      class MyClass {}
      expect(isObject(new MyClass())).toBe(true)
      expect(isObject(new Date())).toBe(true)
      expect(isObject(/regex/)).toBe(true)
    })

    it('数组不是对象', () => {
      expect(isObject([])).toBe(false)
      expect(isObject([1, 2, 3])).toBe(false)
    })

    it('原始类型不是对象', () => {
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
      expect(isObject(42)).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(true)).toBe(false)
      expect(isObject(Symbol())).toBe(false)
    })

    it('函数不是对象（虽然 typeof function 返回 object）', () => {
      expect(isObject(() => {})).toBe(false)
      expect(isObject(function () {})).toBe(false)
    })
  })

  describe('isPlainObject', () => {
    it('识别纯对象', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ a: 1, b: 2 })).toBe(true)
      expect(isPlainObject({ nested: { value: 1 } })).toBe(true)
    })

    it('Object.create(null) 是纯对象', () => {
      const obj = Object.create(null)
      expect(isPlainObject(obj)).toBe(true)
    })

    it('类实例不是纯对象', () => {
      class MyClass {}
      expect(isPlainObject(new MyClass())).toBe(false)
    })

    it('内置对象不是纯对象', () => {
      expect(isPlainObject(new Date())).toBe(false)
      expect(isPlainObject(/regex/)).toBe(false)
      expect(isPlainObject(new Map())).toBe(false)
      expect(isPlainObject(new Set())).toBe(false)
    })

    it('数组不是纯对象', () => {
      expect(isPlainObject([])).toBe(false)
      expect(isPlainObject([1, 2, 3])).toBe(false)
    })

    it('原始类型不是纯对象', () => {
      expect(isPlainObject(null)).toBe(false)
      expect(isPlainObject(undefined)).toBe(false)
      expect(isPlainObject(42)).toBe(false)
      expect(isPlainObject('string')).toBe(false)
      expect(isPlainObject(true)).toBe(false)
      expect(isPlainObject(Symbol())).toBe(false)
    })

    it('函数不是纯对象', () => {
      expect(isPlainObject(() => {})).toBe(false)
      expect(isPlainObject(function () {})).toBe(false)
    })

    it('通过 Object.create() 创建的自定义原型链对象不是纯对象', () => {
      const proto = { customProp: true }
      const obj = Object.create(proto)
      expect(isPlainObject(obj)).toBe(false)
    })
  })

  describe('combineReducers', () => {
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

  describe('omit', () => {
    it('移除对象中的指定键', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = omit(obj, 'b')

      expect(result).toEqual({ a: 1, c: 3 })
      expect(result.b).toBeUndefined()
    })

    it('保持原对象不变', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = omit(obj, 'b')

      expect(obj).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('移除不存在的键返回相同结构', () => {
      const obj = { a: 1, b: 2 }
      const result = omit(obj, 'c' as any)

      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('空对象', () => {
      const result = omit({}, 'a' as any)
      expect(result).toEqual({})
    })
  })

  describe('compose', () => {
    it('无参数时返回恒等函数', () => {
      const composed = compose()
      expect(composed(42)).toBe(42)
      expect(composed('hello')).toBe('hello')
    })

    it('单个函数时返回该函数', () => {
      const double = (x: number) => x * 2
      const composed = compose(double)

      expect(composed(5)).toBe(10)
    })

    it('从右到左组合函数', () => {
      const addOne = (x: number) => x + 1
      const double = (x: number) => x * 2
      const square = (x: number) => x * x

      // square(double(addOne(x)))
      const composed = compose(square, double, addOne)

      expect(composed(3)).toBe(64) // (3 + 1) * 2 = 8, 8^2 = 64
    })

    it('支持不同类型的转换', () => {
      const toString = (x: number) => x.toString()
      const addExclamation = (s: string) => s + '!'
      const toUpperCase = (s: string) => s.toUpperCase()

      const composed = compose(toUpperCase, addExclamation, toString)

      expect(composed(42)).toBe('42!')
    })
  })

  describe('createReducerFactory', () => {
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
        action,
      ) => state

      const rootReducer = reducerFactory(
        { counter: counterReducer },
        { counter: { count: 100 } },
      )

      const state = rootReducer(undefined, { type: '@@INIT' })
      expect(state.counter.count).toBe(100)
    })
  })

  describe('createFeatureReducerFactory', () => {
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
})
