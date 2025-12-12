import { Injectable } from '@sker/core'
import { Render, FilterAst } from '@sker/workflow'
import React from 'react'

const FilterComponent: React.FC<{ ast: FilterAst }> = ({ ast }) => {
    return (<></>)
}

@Injectable()
export class FilterAstRender {
    @Render(FilterAst)
    render(ast: FilterAst, ctx: any) {
        return <FilterComponent ast={ast} />
    }
}
