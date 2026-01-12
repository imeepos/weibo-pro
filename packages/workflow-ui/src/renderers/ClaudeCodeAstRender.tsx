import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { ClaudeCodeAst } from '@sker/workflow-ast';


@Injectable()
export class ClaudeCodeAstRender {
  @Render(ClaudeCodeAst)
  render(ast: ClaudeCodeAst, ctx: any) {
    return null;
  }
}
