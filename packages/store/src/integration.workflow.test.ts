import { describe, it, expect } from 'vitest'
import {
  cartReducer,
  cartActions,
  type Product,
  type CartItem,
} from './integration.fixtures'

describe('@sker/store 集成测试', () => {
  describe('完整工作流', () => {
    it('添加商品到购物车', () => {
      const product: Product = { id: '1', name: 'iPhone', price: 999 }

      const state = cartReducer(undefined, cartActions.addItem({ product, quantity: 1 }))

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
})
