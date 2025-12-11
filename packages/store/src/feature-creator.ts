import { capitalize } from './helpers'
import { isPlainObject } from './utils'
import type { ActionReducer, Primitive, Selector, Prettify } from './models'
import {
  createFeatureSelector,
  createSelector,
  type MemoizedSelector,
} from './selector'

/**
 * Feature 配置
 */
export interface FeatureConfig<FeatureName extends string, FeatureState> {
  name: FeatureName
  reducer: ActionReducer<FeatureState>
}

/**
 * Feature 类型（包含 name、reducer 和自动生成的 selectors）
 */
type Feature<FeatureName extends string, FeatureState> = FeatureConfig<
  FeatureName,
  FeatureState
> &
  BaseSelectors<FeatureName, FeatureState>

/**
 * Feature with Extra Selectors
 */
type FeatureWithExtraSelectors<
  FeatureName extends string,
  FeatureState,
  ExtraSelectors extends SelectorsDictionary,
> = string extends keyof ExtraSelectors
  ? Feature<FeatureName, FeatureState>
  : Omit<Feature<FeatureName, FeatureState>, keyof ExtraSelectors> &
      ExtraSelectors

/**
 * Feature State Selector
 */
type FeatureSelector<FeatureName extends string, FeatureState> = {
  [K in FeatureName as `select${Capitalize<K>}State`]: MemoizedSelector<
    Record<string, any>,
    FeatureState,
    (featureState: FeatureState) => FeatureState
  >
}

/**
 * 嵌套属性选择器（自动为每个 state 属性生成 selector）
 */
type NestedSelectors<FeatureState> = FeatureState extends
  | Primitive
  | unknown[]
  | Date
  ? {}
  : {
      [K in keyof FeatureState &
        string as `select${Capitalize<K>}`]: MemoizedSelector<
        Record<string, any>,
        FeatureState[K],
        (featureState: FeatureState) => FeatureState[K]
      >
    }

/**
 * 基础 Selectors
 */
type BaseSelectors<FeatureName extends string, FeatureState> = FeatureSelector<
  FeatureName,
  FeatureState
> &
  NestedSelectors<FeatureState>

/**
 * Selectors 字典类型
 */
type SelectorsDictionary = Record<
  string,
  | Selector<Record<string, any>, unknown>
  | ((...args: any[]) => Selector<Record<string, any>, unknown>)
>

/**
 * Extra Selectors 工厂函数
 */
type ExtraSelectorsFactory<
  FeatureName extends string,
  FeatureState,
  ExtraSelectors extends SelectorsDictionary,
> = (baseSelectors: BaseSelectors<FeatureName, FeatureState>) => ExtraSelectors

/**
 * 不允许可选属性
 */
type NotAllowedFeatureStateCheck<FeatureState> =
  FeatureState extends Required<FeatureState>
    ? unknown
    : 'feature state 不允许可选属性'

/**
 * 创建 Feature with Extra Selectors
 */
export function createFeature<
  FeatureName extends string,
  FeatureState,
  ExtraSelectors extends SelectorsDictionary,
>(
  featureConfig: FeatureConfig<FeatureName, FeatureState> & {
    extraSelectors: ExtraSelectorsFactory<
      FeatureName,
      FeatureState,
      ExtraSelectors
    >
  } & NotAllowedFeatureStateCheck<FeatureState>,
): Prettify<
  FeatureWithExtraSelectors<FeatureName, FeatureState, ExtraSelectors>
>

/**
 * 创建 Feature
 */
export function createFeature<FeatureName extends string, FeatureState>(
  featureConfig: FeatureConfig<FeatureName, FeatureState> &
    NotAllowedFeatureStateCheck<FeatureState>,
): Prettify<Feature<FeatureName, FeatureState>>

/**
 * 创建 Feature（自动生成 feature selector 和属性 selectors）
 *
 * @example
 * ```ts
 * interface ProductsState {
 *   products: Product[];
 *   selectedId: string | null;
 * }
 *
 * const initialState: ProductsState = {
 *   products: [],
 *   selectedId: null,
 * };
 *
 * const productsFeature = createFeature({
 *   name: 'products',
 *   reducer: createReducer(initialState, ...),
 * });
 *
 * const {
 *   name,                   // 'products'
 *   reducer,                // Reducer 函数
 *   selectProductsState,    // Feature selector
 *   selectProducts,         // 自动生成的属性 selector
 *   selectSelectedId,       // 自动生成的属性 selector
 * } = productsFeature;
 * ```
 *
 * **使用 Extra Selectors**：
 * ```ts
 * export const productsFeature = createFeature({
 *   name: 'products',
 *   reducer: productsReducer,
 *   extraSelectors: ({ selectProductsState }) => ({
 *     selectProductById: (id: string) => createSelector(
 *       selectProductsState,
 *       (state) => state.products.find(p => p.id === id)
 *     ),
 *   }),
 * });
 * ```
 */
export function createFeature<
  FeatureName extends string,
  FeatureState,
  ExtraSelectors extends SelectorsDictionary,
>(
  featureConfig: FeatureConfig<FeatureName, FeatureState> & {
    extraSelectors?: ExtraSelectorsFactory<
      FeatureName,
      FeatureState,
      ExtraSelectors
    >
  },
): Feature<FeatureName, FeatureState> & ExtraSelectors {
  const {
    name,
    reducer,
    extraSelectors: extraSelectorsFactory,
  } = featureConfig

  const featureSelector = createFeatureSelector<FeatureState>(name)
  const nestedSelectors = createNestedSelectors(featureSelector, reducer)
  const baseSelectors = {
    [`select${capitalize(name)}State`]: featureSelector,
    ...nestedSelectors,
  } as BaseSelectors<FeatureName, FeatureState>
  const extraSelectors = extraSelectorsFactory
    ? extraSelectorsFactory(baseSelectors)
    : {}

  return {
    name,
    reducer,
    ...baseSelectors,
    ...extraSelectors,
  } as Feature<FeatureName, FeatureState> & ExtraSelectors
}

/**
 * 为每个 state 属性创建 selector
 */
const createNestedSelectors = <FeatureState>(
  featureSelector: MemoizedSelector<Record<string, any>, FeatureState>,
  reducer: ActionReducer<FeatureState>,
): NestedSelectors<FeatureState> => {
  const initialState = getInitialState(reducer)
  const nestedKeys = (
    isPlainObject(initialState) ? Object.keys(initialState) : []
  ) as Array<keyof FeatureState & string>

  return nestedKeys.reduce(
    (nestedSelectors, nestedKey) => ({
      ...nestedSelectors,
      [`select${capitalize(nestedKey)}`]: createSelector(
        featureSelector,
        (parentState) => parentState?.[nestedKey],
      ),
    }),
    {} as NestedSelectors<FeatureState>,
  )
}

/**
 * 获取 reducer 的初始 state
 */
const getInitialState = <FeatureState>(
  reducer: ActionReducer<FeatureState>,
): FeatureState => reducer(undefined, { type: '@sker/store/feature/init' })
