import { Injectable } from '@sker/core'
import { Render } from '@sker/workflow'
import { BooleanAst } from '@sker/workflow'
import React from 'react'

const BooleanComponent: React.FC<{ ast: BooleanAst }> = ({ ast: _ast }) => {
  return null;
}

@Injectable()
export class BooleanAstRender {
  @Render(BooleanAst)
  render(ast: BooleanAst) {
    return <BooleanComponent ast={ast} />
  }
}
