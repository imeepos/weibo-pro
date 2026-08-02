import { Injectable } from '@sker/core'
import { Render, MergeAst } from '@sker/workflow'
import React from 'react'

const MergeComponent: React.FC<{ ast: MergeAst }> = ({ ast: _ast }) => {
    return (<></>)
}

@Injectable()
export class MergeAstRender {
    @Render(MergeAst)
    render(ast: MergeAst, _ctx: any) {
        return <MergeComponent ast={ast} />
    }
}
