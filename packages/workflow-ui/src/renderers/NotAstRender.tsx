import { Injectable } from '@sker/core'
import { NotAst, Render } from '@sker/workflow'
import React from 'react'

const NotAstComponent: React.FC<{ ast: NotAst }> = ({ ast }) => {
  return null;
}

@Injectable()
export class NotAstRender {
  @Render(NotAst)
  render(ast: NotAst) {
    return <NotAstComponent ast={ast} />
  }
}
