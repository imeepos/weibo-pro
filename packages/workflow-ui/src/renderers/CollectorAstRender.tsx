import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { CollectorAst } from "@sker/workflow";
import React from "react";

/**
 * CollectorAst 渲染组件
 *
 * 展示 IS_BUFFER 模式收集的数据
 */
const CollectorComponent: React.FC<{ ast: CollectorAst }> = ({ ast: _ast }) => {
    return (<></>);
};

@Injectable()
export class CollectorAstRender {
    @Render(CollectorAst)
    render(ast: CollectorAst, _ctx: any) {
        return <CollectorComponent ast={ast} />;
    }
}
