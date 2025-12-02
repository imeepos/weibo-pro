import { Injectable } from '@sker/core';
import { Render } from '@sker/workflow';
import { IfAst } from '@sker/workflow-ast';
import React from 'react';

/**
 * 条件分支节点渲染组件
 *
 * 设计哲学：
 * - 存在即合理：仅展示条件值与分支结果，状态一目了然
 * - 优雅即简约：用类型化显示表达值，无需冗余信息
 */
const IfComponent: React.FC<{ ast: IfAst }> = ({ ast }) => {
    return (<></>);
};

@Injectable()
export class IfAstRender {
    @Render(IfAst)
    render(ast: IfAst, ctx: any) {
        return <IfComponent ast={ast} />;
    }
}
