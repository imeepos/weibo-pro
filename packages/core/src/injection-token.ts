export interface InjectionTokenOptions<T> {
  factory?: () => T;
}

/**
 * 依赖注入令牌类，用于创建类型安全的注入令牌
 * @template T 令牌关联的值类型
 */
export class InjectionToken<T> {
  constructor(
    private readonly description: string,
    private readonly options?: InjectionTokenOptions<T>,
  ) { }

  /**
   * 返回令牌的字符串表示，用于调试
   */
  toString(): string {
    return `InjectionToken ${this.description}`;
  }

  /**
   * 获取令牌的工厂函数
   */
  get factory(): (() => T) | undefined {
    return this.options?.factory;
  }
}

/**
 * Map 类型的注入令牌
 * 用于多值 Map 注入，返回 Map<K, V> 类型
 * @template K Map 中键的类型
 * @template V Map 中值的类型
 */
export class MapInjectionToken<K, V> extends InjectionToken<Map<K, V>> {
  constructor(description: string, options?: InjectionTokenOptions<Map<K, V>>) {
    super(description, options);
  }
}
