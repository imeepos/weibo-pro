import { describe, it, expect } from 'vitest'
import { createSelector } from '../src'
import { cartFeature } from './integration.fixtures'

describe('@sker/store 集成测试', () => {
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
})
