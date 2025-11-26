import { RxNode } from "./types";

/**
 * 编译器的作用是为 json的序列化和反序列化 以及减少运行时的开销
 * 支持简单的表达式
 */
export class RxCompiler {
    compile(node: RxNode): RxNode {
        throw new Error(`not implement`)
    }
}
