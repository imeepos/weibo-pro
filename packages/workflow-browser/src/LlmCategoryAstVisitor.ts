import { Injectable } from "@sker/core";
import { Handler, INode } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";
import { Observable, concatMap } from "rxjs";
import { handlerRemote } from "./execute-remote.js";

@Injectable()
export class LlmCategoryAstVisitor {
  @Handler(LlmCategoryAst)
  handler(ast: LlmCategoryAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx)
  }
}
