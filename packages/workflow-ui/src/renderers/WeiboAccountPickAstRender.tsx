import React from 'react';
import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { WeiboAccountPickAst } from '@sker/workflow-ast';
import { WeiboAccountList } from '@sker/ui/components/ui';

const WeiboAccountPickRender: React.FC<{ ast: WeiboAccountPickAst }> = ({ ast }) => {
    if (ast.state === 'pending' || !ast.list || ast.list.length === 0) {
        return null;
    }

    return <WeiboAccountList accounts={ast.list} selectedId={ast.selectedId} />;
};

@Injectable()
export class WeiboAccountPickAstRender {
    @Render(WeiboAccountPickAst)
    render(ast: WeiboAccountPickAst) {
        return <WeiboAccountPickRender ast={ast} />;
    }
}
