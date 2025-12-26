import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { SqlExecuteAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class SqlExecuteAstBrowserVisitor {
  @Handler(SqlExecuteAst)
  handler(ast: SqlExecuteAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
