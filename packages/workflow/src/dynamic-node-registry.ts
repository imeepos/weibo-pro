import { Type, root } from '@sker/core';
import { NODE, NodeMetadata, findNodeType, DERIVED_INPUT, DERIVED_OUTPUT } from './decorator';

/**
 * 动态节点注册器
 *
 * 存在即合理：
 * - 运行时动态创建派生节点类
 * - 注册到全局节点注册表
 */
export class DynamicNodeRegistry {
  /**
   * 注册派生节点
   */
  static register(params: {
    name: string;
    baseType: string;
    frozenInputs: Record<string, unknown>;
    nodeMetadata: {
      class: { title: string; type: string; description?: string };
      inputs?: Array<{ property: string; title: string }>;
      outputs?: Array<{ property: string; title: string }>;
      states?: Array<{ property: string; title: string }>;
    };
  }): Type<any> {
    const BaseClass = findNodeType(params.baseType);
    if (!BaseClass) {
      throw new Error(`基类节点不存在: ${params.baseType}`);
    }

    const DerivedClass = this.createDerivedClass(params.name, BaseClass, params.frozenInputs);
    this.registerNode(DerivedClass, params.nodeMetadata);

    return DerivedClass;
  }

  /**
   * 创建派生类
   */
  private static createDerivedClass(
    name: string,
    BaseClass: Type<any>,
    frozenInputs: Record<string, unknown>
  ): Type<any> {
    const DerivedClass = class extends BaseClass {
      constructor() {
        super();
        Object.assign(this, frozenInputs);
      }
    };

    Object.defineProperty(DerivedClass, 'name', { value: name });
    return DerivedClass;
  }

  /**
   * 注册节点到全局注册表
   */
  private static registerNode(
    DerivedClass: Type<any>,
    nodeMetadata: {
      class: { title: string; type: string; description?: string };
      inputs?: Array<{ property: string; title: string }>;
      outputs?: Array<{ property: string; title: string }>;
      states?: Array<{ property: string; title: string }>;
    }
  ): void {
    const metadata: NodeMetadata = {
      target: DerivedClass,
      title: nodeMetadata.class.title,
      type: nodeMetadata.class.type as any,
    };

    root.set([{ provide: NODE, useValue: metadata, multi: true }]);

    // 注册自定义 inputs 到 DERIVED_INPUT
    if (nodeMetadata.inputs) {
      root.set([{
        provide: DERIVED_INPUT,
        useValue: {
          target: DerivedClass,
          inputs: nodeMetadata.inputs
        },
        multi: true
      }]);
    }

    // 注册自定义 outputs 到 DERIVED_OUTPUT
    if (nodeMetadata.outputs) {
      root.set([{
        provide: DERIVED_OUTPUT,
        useValue: {
          target: DerivedClass,
          outputs: nodeMetadata.outputs
        },
        multi: true
      }]);
    }
  }

  /**
   * 获取所有已注册的派生节点
   */
  static getAll(): NodeMetadata[] {
    return root.get(NODE, []);
  }
}
