import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { MarkdownUploadAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class MarkdownUploadAstBrowserVisitor {
  @Handler(MarkdownUploadAst)
  handler(ast: MarkdownUploadAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
