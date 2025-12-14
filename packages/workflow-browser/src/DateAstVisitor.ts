import { Injectable } from "@sker/core";
import { DateAst, Handler } from "@sker/workflow";
import { executeRemote } from "./execute-remote.js";

@Injectable()
export class DateAstVisitor {
    @Handler(DateAst)
    handler(ast: DateAst, ctx: any) {
        return executeRemote(ast, ctx)
    }
}