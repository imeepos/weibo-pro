import { InjectionToken, root, Type } from '@sker/core'
import { resolveConstructor } from './node'

/**
 * 工具方法元数据
 * 类似 HANDLER_METHOD 的设计
 */
export interface ToolMethodMetadata {
    ast: Type<any>;              // 节点类型（如 TextAreaAst）
    target: Type<any>;           // 工具类（如 TextAreaTool）
    property: string | symbol;   // 方法名（如 'get', 'detail'）
}

/**
 * 工具方法注册 Token
 */
export const TOOL_METHOD = new InjectionToken<ToolMethodMetadata[]>(`TOOL_METHOD`);

/**
 * @Tool 方法装饰器
 * 标记某个方法为特定节点类型的工具方法
 *
 * @param ast 节点类型（如 TextAreaAst）
 *
 * @example
 * @Injectable()
 * export class TextAreaTool {
 *   @Tool(TextAreaAst)
 *   get(ast: TextAreaAst): {id: string, title: string, summary: string, content: string } {}
 * }
 */
export function Tool(ast: Type<any>): MethodDecorator {
    return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor): any => {
        const ctor = resolveConstructor(target);

        root.set([
            {
                provide: TOOL_METHOD,
                multi: true,
                useValue: {
                    ast: ast,
                    target: ctor,
                    property: propertyKey
                }
            },
            {
                provide: ctor,
                useClass: ctor
            }
        ]);

        return descriptor;
    };
}

/**
 * 获取节点类型的所有工具方法
 */
export function getToolMethods(ast: Type<any>): ToolMethodMetadata[] {
    const allTools = root.get(TOOL_METHOD, []);
    return allTools.filter(tool => tool.ast === ast);
}

/**
 * 检查节点类型是否有工具支持
 */
export function hasTool(ast: Type<any>): boolean {
    return getToolMethods(ast).length > 0;
}
