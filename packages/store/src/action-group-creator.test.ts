import { describe, it, expect } from 'vitest'
import { createActionGroup, emptyProps } from './action-group-creator'
import { props } from './action-creator'

describe('action-group-creator', () => {
  describe('createActionGroup', () => {
    it('批量创建 actions', () => {
      const authActions = createActionGroup({
        source: 'Auth',
        events: {
          'Login Success': props<{ userId: number }>(),
          'Login Failure': props<{ error: string }>(),
          'Logout': emptyProps(),
        },
      })

      expect(authActions.loginSuccess).toBeDefined()
      expect(authActions.loginFailure).toBeDefined()
      expect(authActions.logout).toBeDefined()
    })

    it('生成正确的 action types', () => {
      const userActions = createActionGroup({
        source: 'User API',
        events: {
          'Load Users': emptyProps(),
          'Load Success': props<{ users: any[] }>(),
          'Load Failure': props<{ error: string }>(),
        },
      })

      expect(userActions.loadUsers().type).toBe('[User API] Load Users')
      expect(userActions.loadSuccess({ users: [] }).type).toBe(
        '[User API] Load Success',
      )
      expect(userActions.loadFailure({ error: 'Error' }).type).toBe(
        '[User API] Load Failure',
      )
    })

    it('事件名转换为 camelCase', () => {
      const apiActions = createActionGroup({
        source: 'API',
        events: {
          'Fetch Data Success': emptyProps(),
          'UPLOAD FILE': emptyProps(),
          'delete item': emptyProps(),
        },
      })

      expect(apiActions.fetchDataSuccess).toBeDefined()
      expect(apiActions.uploadFile).toBeDefined()
      expect(apiActions.deleteItem).toBeDefined()
    })

    it('支持单词事件名', () => {
      const simpleActions = createActionGroup({
        source: 'Simple',
        events: {
          Start: emptyProps(),
          Stop: emptyProps(),
          Reset: emptyProps(),
        },
      })

      expect(simpleActions.start).toBeDefined()
      expect(simpleActions.stop).toBeDefined()
      expect(simpleActions.reset).toBeDefined()

      expect(simpleActions.start().type).toBe('[Simple] Start')
    })

    it('处理带空格的事件名', () => {
      const spacedActions = createActionGroup({
        source: 'Test',
        events: {
          '  Trimmed  Action  ': emptyProps(),
        },
      })

      expect(spacedActions.trimmedAction).toBeDefined()
      expect(spacedActions.trimmedAction().type).toBe(
        '[Test]   Trimmed  Action  ',
      )
    })

    it('支持自定义 creator', () => {
      const customActions = createActionGroup({
        source: 'Custom',
        events: {
          'Complex Action': (id: number, name: string) => ({
            id,
            name,
            timestamp: Date.now(),
          }),
        },
      })

      const action = customActions.complexAction(1, 'test')
      expect(action.type).toBe('[Custom] Complex Action')
      expect(action.id).toBe(1)
      expect(action.name).toBe('test')
      expect(action.timestamp).toBeDefined()
    })

    it('混合不同类型的 events', () => {
      const mixedActions = createActionGroup({
        source: 'Mixed',
        events: {
          Simple: emptyProps(),
          WithProps: props<{ value: number }>(),
          Custom: (x: number, y: number) => ({ sum: x + y }),
        },
      })

      const simple = mixedActions.simple()
      expect(simple).toEqual({ type: '[Mixed] Simple' })

      const withProps = mixedActions.withProps({ value: 42 })
      expect(withProps).toEqual({ type: '[Mixed] WithProps', value: 42 })

      const custom = mixedActions.custom(3, 5)
      expect(custom).toEqual({ type: '[Mixed] Custom', sum: 8 })
    })

    it('创建的 action creators 包含 type 属性', () => {
      const actions = createActionGroup({
        source: 'Test',
        events: {
          Action1: emptyProps(),
          Action2: props<{ data: string }>(),
        },
      })

      expect(actions.action1.type).toBe('[Test] Action1')
      expect(actions.action2.type).toBe('[Test] Action2')
    })

    it('支持复杂的 props 类型', () => {
      interface User {
        id: number
        name: string
        roles: string[]
      }

      const userActions = createActionGroup({
        source: 'User',
        events: {
          'Set Current User': props<{ user: User }>(),
          'Update User Roles': props<{ userId: number; roles: string[] }>(),
        },
      })

      const user: User = { id: 1, name: 'Alice', roles: ['admin'] }
      const action1 = userActions.setCurrentUser({ user })
      expect(action1.user).toEqual(user)

      const action2 = userActions.updateUserRoles({
        userId: 1,
        roles: ['user', 'editor'],
      })
      expect(action2.roles).toEqual(['user', 'editor'])
    })
  })

  describe('emptyProps', () => {
    it('返回空 props 配置', () => {
      const result = emptyProps()
      expect(result).toEqual({
        _as: 'props',
        _p: undefined,
      })
    })

    it('可用于创建无参数 action', () => {
      const actions = createActionGroup({
        source: 'Test',
        events: {
          'No Params': emptyProps(),
        },
      })

      const action = actions.noParams()
      expect(action).toEqual({ type: '[Test] No Params' })
    })
  })
})
