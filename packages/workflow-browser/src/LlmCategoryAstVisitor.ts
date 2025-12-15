import { Injectable } from "@sker/core";
import { Handler, INode } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";
import { Observable, switchMap } from "rxjs";
import { executeRemote } from "./execute-remote.js";

@Injectable()
export class LlmCategoryAstVisitor {
    @Handler(LlmCategoryAst)
    handler(ast: LlmCategoryAst, $input: Observable<any>, ctx: any) {
        return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
    }
}
