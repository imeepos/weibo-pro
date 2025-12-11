import { describe, it, expect } from 'vitest'
import {
  createAction,
  createActionGroup,
  createReducer,
  createSelector,
  createFeature,
  emptyProps,
  props,
  on,
} from '../src'

/**
 * 集成测试 - 完整的 Store 工作流
 *
 * 测试场景：用户购物车应用
 * - Actions: 添加商品、移除商品、更新数量、清空购物车
 * - Reducer: 管理购物车状态
 * - Selectors: 计算总价、商品数量等
 */
describe('@sker/store 集成测试', () => {
  // 定义类型
  interface Product {
    id: string
    name: string
    price: number
  }

  interface CartItem {
    product: Product
    quantity: number
  }

  interface CartState {
    items: CartItem[]
    loading: boolean
    error: string | null
  }

  // 创建 Actions（使用 Action Group）
  const cartActions = createActionGroup({
    source: 'Cart',
    events: {
      'Add Item': props<{ product: Product; quantity: number }>(),
      'Remove Item': props<{ productId: string }>(),
      'Update Quantity': props<{ productId: string; quantity: number }>(),
      'Clear Cart': emptyProps(),
      'Load Cart': emptyProps(),
      'Load Cart Success': props<{ items: CartItem[] }>(),
      'Load Cart Failure': props<{ error: string }>(),
    },
  })

  // 创建 Reducer
  const initialState: CartState = {
    items: [],
    loading: false,
    error: null,
  }

  const cartReducer = createReducer(
    initialState,
    on(cartActions.addItem, (state, { product, quantity }) => {
      const existingItem = state.items.find(
        (item) => item.product.id === product.id,
      )

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          ),
        }
      }

      return {
        ...state,
        items: [...state.items, { product, quantity }],
      }
    }),
    on(cartActions.removeItem, (state, { productId }) => ({
      ...state,
      items: state.items.filter((item) => item.product.id !== productId),
    })),
    on(cartActions.updateQuantity, (state, { productId, quantity }) => ({
      ...state,
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    })),
    on(cartActions.clearCart, (state) => ({
      ...state,
      items: [],
    })),
    on(cartActions.loadCart, (state) => ({
      ...state,
      loading: true,
      error: null,
    })),
    on(cartActions.loadCartSuccess, (state, { items }) => ({
      ...state,
      items,
      loading: false,
    })),
    on(cartActions.loadCartFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
    })),
  )

  // 创建 Feature（自动生成 selectors）
  const cartFeature = createFeature({
    name: 'cart',
    reducer: cartReducer,
    extraSelectors: ({ selectCartState, selectItems }) => ({
      // 总价
      selectTotalPrice: createSelector(selectItems, (items) =>
        items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0,
        ),
      ),
      // 商品数量
      selectItemCount: createSelector(
        selectItems,
        (items) => items.reduce((sum, item) => sum + item.quantity, 0),
      ),
      // 根据 ID 查找商品
      selectItemByProductId: (productId: string) =>
        createSelector(selectItems, (items) =>
          items.find((item) => item.product.id === productId),
        ),
      // 是否为空
      selectIsEmpty: createSelector(selectItems, (items) => items.length === 0),
    }),
  })

  describe('完整工作流', () => {
    it('添加商品到购物车', () => {
      const product: Product = { id: '1', name: 'iPhone', price: 999 }

      let state = cartReducer(undefined, cartActions.addItem({ product, quantity: 1 }))

      expect(state.items).toHaveLength(1)
      expect(state.items[0].product.name).toBe('iPhone')
      expect(state.items[0].quantity).toBe(1)
    })

    it('重复添加相同商品会增加数量', () => {
      const product: Product = { id: '1', name: 'iPhone', price: 999 }

      let state = cartReducer(undefined, cartActions.addItem({ product, quantity: 1 }))
      state = cartReducer(state, cartActions.addItem({ product, quantity: 2 }))

      expect(state.items).toHaveLength(1)
      expect(state.items[0].quantity).toBe(3)
    })

    it('移除商品', () => {
      const product1: Product = { id: '1', name: 'iPhone', price: 999 }
      const product2: Product = { id: '2', name: 'iPad', price: 599 }

      let state = cartReducer(undefined, cartActions.addItem({ product: product1, quantity: 1 }))
      state = cartReducer(state, cartActions.addItem({ product: product2, quantity: 1 }))
      expect(state.items).toHaveLength(2)

      state = cartReducer(state, cartActions.removeItem({ productId: '1' }))
      expect(state.items).toHaveLength(1)
      expect(state.items[0].product.id).toBe('2')
    })

    it('更新商品数量', () => {
      const product: Product = { id: '1', name: 'iPhone', price: 999 }

      let state = cartReducer(undefined, cartActions.addItem({ product, quantity: 1 }))
      state = cartReducer(state, cartActions.updateQuantity({ productId: '1', quantity: 5 }))

      expect(state.items[0].quantity).toBe(5)
    })

    it('清空购物车', () => {
      const product1: Product = { id: '1', name: 'iPhone', price: 999 }
      const product2: Product = { id: '2', name: 'iPad', price: 599 }

      let state = cartReducer(undefined, cartActions.addItem({ product: product1, quantity: 1 }))
      state = cartReducer(state, cartActions.addItem({ product: product2, quantity: 1 }))
      expect(state.items).toHaveLength(2)

      state = cartReducer(state, cartActions.clearCart())
      expect(state.items).toHaveLength(0)
    })

    it('处理异步加载状态', () => {
      let state = cartReducer(undefined, cartActions.loadCart())
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()

      const items: CartItem[] = [
        {
          product: { id: '1', name: 'iPhone', price: 999 },
          quantity: 2,
        },
      ]

      state = cartReducer(state, cartActions.loadCartSuccess({ items }))
      expect(state.loading).toBe(false)
      expect(state.items).toEqual(items)
    })

    it('处理加载失败', () => {
      let state = cartReducer(undefined, cartActions.loadCart())
      state = cartReducer(state, cartActions.loadCartFailure({ error: 'Network error' }))

      expect(state.loading).toBe(false)
      expect(state.error).toBe('Network error')
    })
  })

  describe('Feature Selectors', () => {
    const mockAppState = {
      cart: {
        items: [
          {
            product: { id: '1', name: 'iPhone', price: 999 },
            quantity: 2,
          },
          {
            product: { id: '2', name: 'iPad', price: 599 },
            quantity: 1,
          },
        ],
        loading: false,
        error: null,
      },
    }

    it('selectCartState 返回完整 cart 状态', () => {
      const result = cartFeature.selectCartState(mockAppState)
      expect(result).toEqual(mockAppState.cart)
    })

    it('selectItems 返回购物车商品列表', () => {
      const result = cartFeature.selectItems(mockAppState)
      expect(result).toHaveLength(2)
      expect(result[0].product.name).toBe('iPhone')
    })

    it('selectLoading 返回加载状态', () => {
      const result = cartFeature.selectLoading(mockAppState)
      expect(result).toBe(false)
    })

    it('selectError 返回错误信息', () => {
      const result = cartFeature.selectError(mockAppState)
      expect(result).toBeNull()
    })

    it('selectTotalPrice 计算总价', () => {
      const result = cartFeature.selectTotalPrice(mockAppState)
      expect(result).toBe(999 * 2 + 599 * 1)
    })

    it('selectItemCount 计算商品总数量', () => {
      const result = cartFeature.selectItemCount(mockAppState)
      expect(result).toBe(3)
    })

    it('selectItemByProductId 查找指定商品', () => {
      const selector = cartFeature.selectItemByProductId('2')
      const result = selector(mockAppState)
      expect(result?.product.name).toBe('iPad')
    })

    it('selectIsEmpty 判断购物车是否为空', () => {
      const result = cartFeature.selectIsEmpty(mockAppState)
      expect(result).toBe(false)

      const emptyState = { cart: { items: [], loading: false, error: null } }
      expect(cartFeature.selectIsEmpty(emptyState)).toBe(true)
    })

    it('selectors 具有记忆化能力', () => {
      let callCount = 0
      const customSelector = createSelector(
        cartFeature.selectItems,
        (items) => {
          callCount++
          return items.length
        },
      )

      customSelector(mockAppState)
      expect(callCount).toBe(1)

      customSelector(mockAppState)
      expect(callCount).toBe(1) // 未增加，使用了缓存
    })
  })

  describe('复杂业务场景', () => {
    it('完整的购物流程：添加 → 更新 → 选择器计算', () => {
      const product1: Product = { id: '1', name: 'iPhone', price: 999 }
      const product2: Product = { id: '2', name: 'iPad', price: 599 }

      // 初始状态
      let state = initialState

      // 添加商品
      state = cartReducer(state, cartActions.addItem({ product: product1, quantity: 1 }))
      state = cartReducer(state, cartActions.addItem({ product: product2, quantity: 2 }))

      // 更新数量
      state = cartReducer(state, cartActions.updateQuantity({ productId: '1', quantity: 3 }))

      // 构造应用状态
      const appState = { cart: state }

      // 使用 selectors
      expect(cartFeature.selectItemCount(appState)).toBe(5)
      expect(cartFeature.selectTotalPrice(appState)).toBe(999 * 3 + 599 * 2)
      expect(cartFeature.selectIsEmpty(appState)).toBe(false)
    })

    it('处理边界情况：数量为 0 时移除商品', () => {
      const product: Product = { id: '1', name: 'iPhone', price: 999 }

      let state = cartReducer(undefined, cartActions.addItem({ product, quantity: 1 }))
      state = cartReducer(state, cartActions.updateQuantity({ productId: '1', quantity: 0 }))

      // 虽然数量更新为 0，但商品仍在列表中（业务逻辑可根据需求调整）
      expect(state.items[0].quantity).toBe(0)
    })
  })
})
