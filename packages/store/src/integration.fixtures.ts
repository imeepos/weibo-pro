import {
  createActionGroup,
  createReducer,
  createSelector,
  createFeature,
  emptyProps,
  props,
  on,
} from '../src'

// 定义类型
export interface Product {
  id: string
  name: string
  price: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface CartState {
  items: CartItem[]
  loading: boolean
  error: string | null
}

// 创建 Actions（使用 Action Group）
export const cartActions = createActionGroup({
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
export const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
}

export const cartReducer = createReducer(
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
export const cartFeature = createFeature({
  name: 'cart',
  reducer: cartReducer,
  extraSelectors: ({ selectCartState: _selectCartState, selectItems }) => ({
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
