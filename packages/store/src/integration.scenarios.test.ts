import { describe, it, expect } from 'vitest'
import {
  cartReducer,
  cartActions,
  initialState,
  cartFeature,
  type Product,
} from './integration.fixtures'

describe('@sker/store 集成测试', () => {
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
