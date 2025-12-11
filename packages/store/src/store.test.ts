import { describe, it, expect, vi } from 'vitest'
import { Store, select } from './store'
import { createStore } from './create-store'
import type { ActionReducer } from './models'

describe('Store', () => {
  interface TestState {
    counter: { count: number }
    user: { name: string }
  }

  const counterReducer: ActionReducer<{ count: number }> = (
    state = { count: 0 },
    action,
  ) => {
    if (action.type === 'INCREMENT') return { count: state.count + 1 }
    if (action.type === 'DECREMENT') return { count: state.count - 1 }
    return state
  }

  const userReducer: ActionReducer<{ name: string }> = (
    state = { name: '' },
    action,
  ) => {
    if (action.type === 'SET_NAME') return { name: (action as any).name }
    return state
  }

  function createTestStore() {
    return createStore<TestState>({
      counter: counterReducer,
      user: userReducer,
    })
  }

  describe('dispatch', () => {
    it('派发 action 并更新状态', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const states: any[] = []

        store.subscribe((state) => {
          states.push(state)
          if (states.length === 2) {
            expect(states[0].counter.count).toBe(0)
            expect(states[1].counter.count).toBe(1)
            resolve()
          }
        })

        store.dispatch({ type: 'INCREMENT' })
      }))

    it('派发多个 action', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        let finalState: TestState | undefined

        store.subscribe((state) => {
          finalState = state
        })

        store.dispatch({ type: 'INCREMENT' })
        store.dispatch({ type: 'INCREMENT' })
        store.dispatch({ type: 'SET_NAME', name: 'Alice' } as any)

        setTimeout(() => {
          expect(finalState?.counter.count).toBe(2)
          expect(finalState?.user.name).toBe('Alice')
          resolve()
        }, 10)
      }))
  })

  describe('select', () => {
    it('使用函数选择器选择状态切片', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const counts: number[] = []

        store.select((state) => state.counter.count).subscribe((count) => {
          counts.push(count)
          if (counts.length === 2) {
            expect(counts).toEqual([0, 1])
            resolve()
          }
        })

        store.dispatch({ type: 'INCREMENT' })
      }))

    it('使用键路径选择状态（单层）', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const counters: any[] = []

        store.select('counter').subscribe((counter) => {
          counters.push(counter)
          if (counters.length === 2) {
            expect(counters[0]).toEqual({ count: 0 })
            expect(counters[1]).toEqual({ count: 1 })
            resolve()
          }
        })

        store.dispatch({ type: 'INCREMENT' })
      }))

    it('使用键路径选择状态（多层）', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const counts: number[] = []

        store.select('counter', 'count').subscribe((count) => {
          counts.push(count)
          if (counts.length === 2) {
            expect(counts).toEqual([0, 1])
            resolve()
          }
        })

        store.dispatch({ type: 'INCREMENT' })
      }))

    it('自动去重：相同值不触发订阅', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const names: string[] = []

        store.select('user', 'name').subscribe((name) => {
          names.push(name)
        })

        store.dispatch({ type: 'INCREMENT' })
        store.dispatch({ type: 'INCREMENT' })
        store.dispatch({ type: 'SET_NAME', name: 'Alice' } as any)

        setTimeout(() => {
          expect(names).toEqual(['', 'Alice']) // 只有变化的值
          resolve()
        }, 10)
      }))

    it('抛出错误：非法参数类型', () => {
      const store = createTestStore()

      expect(() => {
        store.select(42 as any).subscribe()
      }).toThrow("Unexpected type 'number' in select operator")
    })
  })

  describe('select operator', () => {
    it('使用 select operator 从状态流中选择切片', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const counts: number[] = []

        store
          .pipe(select((state) => state.counter.count))
          .subscribe((count) => {
            counts.push(count)
            if (counts.length === 2) {
              expect(counts).toEqual([0, 1])
              resolve()
            }
          })

        store.dispatch({ type: 'INCREMENT' })
      }))

    it('select operator 使用键路径', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const counts: number[] = []

        store.pipe(select('counter', 'count')).subscribe((count) => {
          counts.push(count)
          if (counts.length === 2) {
            expect(counts).toEqual([0, 1])
            resolve()
          }
        })

        store.dispatch({ type: 'INCREMENT' })
      }))
  })

  describe('Observer 接口', () => {
    it('next() 等同于 dispatch()', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const states: any[] = []

        store.subscribe((state) => {
          states.push(state)
          if (states.length === 2) {
            expect(states[1].counter.count).toBe(1)
            resolve()
          }
        })

        store.next({ type: 'INCREMENT' })
      }))
  })

  describe('动态 Reducer 管理', () => {
    it('addReducer() 添加新的 reducer', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()

        const cartReducer: ActionReducer<{ items: string[] }> = (
          state = { items: [] },
          action,
        ) => {
          if (action.type === 'ADD_ITEM') {
            return { items: [...state.items, (action as any).item] }
          }
          return state
        }

        store.addReducer('cart', cartReducer)

        setTimeout(() => {
          store.select('cart' as any).subscribe((cart: any) => {
            expect(cart).toEqual({ items: [] })
            resolve()
          })
        }, 10)
      }))

    it('removeReducer() 移除 reducer', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()

        store.removeReducer('user')

        setTimeout(() => {
          store.subscribe((state: any) => {
            expect(state.user).toBeUndefined()
            expect(state.counter).toBeDefined()
            resolve()
          })

          store.dispatch({ type: 'INCREMENT' })
        }, 10)
      }))
  })

  describe('Observable 行为', () => {
    it('可以被多个订阅者订阅', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        const subscriber1Values: number[] = []
        const subscriber2Values: number[] = []

        store.select('counter', 'count').subscribe((count) => {
          subscriber1Values.push(count)
        })

        store.select('counter', 'count').subscribe((count) => {
          subscriber2Values.push(count)
        })

        store.dispatch({ type: 'INCREMENT' })

        setTimeout(() => {
          expect(subscriber1Values).toEqual([0, 1])
          expect(subscriber2Values).toEqual([0, 1])
          resolve()
        }, 10)
      }))

    it('订阅后立即收到当前状态', () =>
      new Promise<void>((resolve) => {
        const store = createTestStore()
        store.dispatch({ type: 'INCREMENT' })

        setTimeout(() => {
          store.select('counter', 'count').subscribe((count) => {
            expect(count).toBe(1) // 立即收到当前值
            resolve()
          })
        }, 10)
      }))
  })
})
