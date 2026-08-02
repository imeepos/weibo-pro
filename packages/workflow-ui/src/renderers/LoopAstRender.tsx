import { Injectable } from '@sker/core'
import { Render, LoopAst } from '@sker/workflow'
import React from 'react'

const LoopComponent: React.FC<{ ast: LoopAst }> = ({ ast: _ast }) => {
    return (<></>)
}

@Injectable()
export class LoopAstRender {
    @Render(LoopAst)
    render(ast: LoopAst, _ctx: any) {
        return <LoopComponent ast={ast} />
    }
}
