import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { PropertySelectorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class PropertySelectorAstBrowserVisitor {
  @Handler(PropertySelectorAst)
  handler(ast: PropertySelectorAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
