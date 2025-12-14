import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { CollectorAst } from "@sker/workflow";
import { Observable } from "rxjs";
import { executeRemote } from "./execute-remote.js";

/**
 * 收集器 Visitor - 处理 CollectorAst 节点
 *
 * 演示 IS_BUFFER 模式的使用
 */
@Injectable()
export class CollectorVisitor {
    @Handler(CollectorAst)
    handler(ast: CollectorAst, ctx: any) {
        return executeRemote(ast, ctx)
    }
}
