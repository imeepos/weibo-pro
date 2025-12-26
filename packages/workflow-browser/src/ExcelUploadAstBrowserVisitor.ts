import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { ExcelUploadAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class ExcelUploadAstBrowserVisitor {
  @Handler(ExcelUploadAst)
  handler(ast: ExcelUploadAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
