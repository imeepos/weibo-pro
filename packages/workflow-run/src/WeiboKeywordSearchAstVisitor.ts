import { Injectable } from "@sker/core";
import { Handler } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";


@Injectable()
export class WeiboKeywordSearchAstVisitor {
    @Handler(WeiboKeywordSearchAst)
    handler(ast: WeiboKeywordSearchAst, ctx: any) {

    }
}