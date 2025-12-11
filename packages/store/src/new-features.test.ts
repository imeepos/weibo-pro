/**
 * @sker/store 新功能使用示例
 *
 * 演示：
 * 1. createActionGroup - 批量创建 actions
 * 2. createFeature - 自动生成 feature selectors
 * 3. helpers - 辅助函数
 */

import { describe, it, expect } from 'vitest'
import {
  createActionGroup,
  emptyProps,
  props,
  createFeature,
  createReducer,
  createSelector,
  on,
  capitalize,
  uncapitalize,
  assertDefined,
} from '../src'

describe('Action Group Creator', () => {
  it('应该批量创建 actions', () => {
    const authApiActions = createActionGroup({
      source: 'Auth API',
      events: {
        'Login Success': props<{ userId: number; token: string }>(),
        'Login Failure': props<{ error: string }>(),
        'Logout Success': emptyProps(),
      },
    })

    // 验证 action creators 已创建
    expect(authApiActions.loginSuccess).toBeDefined()
    expect(authApiActions.loginFailure).toBeDefined()
    expect(authApiActions.logoutSuccess).toBeDefined()

    // 验证 action type
    const loginAction = authApiActions.loginSuccess({
      userId: 10,
      token: 'token',
    })
    expect(loginAction.type).toBe('[Auth API] Login Success')
    expect(loginAction.userId).toBe(10)
    expect(loginAction.token).toBe('token')

    // 验证无参数 action
    const logoutAction = authApiActions.logoutSuccess()
    expect(logoutAction.type).toBe('[Auth API] Logout Success')
  })
})

describe('Feature Creator', () => {
  it('应该自动生成 feature selectors', () => {
    interface ProductsState {
      products: Array<{ id: string; name: string }>
      selectedId: string | null
    }

    const initialState: ProductsState = {
      products: [],
      selectedId: null,
    }

    const productsFeature = createFeature({
      name: 'products',
      reducer: createReducer(initialState),
    })

    // 验证 name 和 reducer
    expect(productsFeature.name).toBe('products')
    expect(productsFeature.reducer).toBeDefined()

    // 验证自动生成的 selectors
    expect(productsFeature.selectProductsState).toBeDefined()
    expect(productsFeature.selectProducts).toBeDefined()
    expect(productsFeature.selectSelectedId).toBeDefined()

    // 测试 selectors
    const state = {
      products: {
        products: [{ id: '1', name: 'Product 1' }],
        selectedId: '1',
      },
    }

    const productsState = productsFeature.selectProductsState(state)
    expect(productsState.products).toHaveLength(1)
    expect(productsState.selectedId).toBe('1')

    const products = productsFeature.selectProducts(state)
    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Product 1')

    const selectedId = productsFeature.selectSelectedId(state)
    expect(selectedId).toBe('1')
  })

  it('应该支持 extra selectors', () => {
    interface ProductsState {
      products: Array<{ id: string; name: string }>
      selectedId: string | null
    }

    const initialState: ProductsState = {
      products: [],
      selectedId: null,
    }

    const productsFeature = createFeature({
      name: 'products',
      reducer: createReducer(initialState),
      extraSelectors: ({ selectProductsState, selectProducts }) => ({
        selectProductsCount: createSelector(
          selectProducts,
          (products) => products.length,
        ),
        selectSelectedProduct: createSelector(
          selectProductsState,
          (state) =>
            state.products.find((p) => p.id === state.selectedId) || null,
        ),
      }),
    })

    // 验证 extra selectors
    expect(productsFeature.selectProductsCount).toBeDefined()
    expect(productsFeature.selectSelectedProduct).toBeDefined()

    // 测试 extra selectors
    const state = {
      products: {
        products: [
          { id: '1', name: 'Product 1' },
          { id: '2', name: 'Product 2' },
        ],
        selectedId: '2',
      },
    }

    const count = productsFeature.selectProductsCount(state)
    expect(count).toBe(2)

    const selectedProduct = productsFeature.selectSelectedProduct(state)
    expect(selectedProduct?.name).toBe('Product 2')
  })
})

describe('Helpers', () => {
  it('capitalize 应该首字母大写', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('world')).toBe('World')
  })

  it('uncapitalize 应该首字母小写', () => {
    expect(uncapitalize('Hello')).toBe('hello')
    expect(uncapitalize('World')).toBe('world')
  })

  it('assertDefined 应该断言值已定义', () => {
    const value: string | null = 'test'
    expect(() => assertDefined(value, 'value')).not.toThrow()

    const nullValue: string | null = null
    expect(() => assertDefined(nullValue, 'nullValue')).toThrow('nullValue 必须定义')

    const undefinedValue: string | undefined = undefined
    expect(() => assertDefined(undefinedValue, 'undefinedValue')).toThrow(
      'undefinedValue 必须定义',
    )
  })
})
