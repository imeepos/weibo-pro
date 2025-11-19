import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { WeiboKeywordSearchAst } from "@sker/workflow-ast";
import React from "react";

const WeiboKeywordSearchComponent: React.FC<{ ast: WeiboKeywordSearchAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class WeiboKeywordSearchAstRender {
    @Render(WeiboKeywordSearchAst)
    render(ast: WeiboKeywordSearchAst) {
        return <WeiboKeywordSearchComponent ast={ast} />;
    }
}