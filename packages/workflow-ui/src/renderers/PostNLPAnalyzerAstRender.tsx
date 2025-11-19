import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { PostNLPAnalyzerAst } from "@sker/workflow-ast";
import React from "react";

const PostNLPAnalyzerComponent: React.FC<{ ast: PostNLPAnalyzerAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class PostNLPAnalyzerAstRender {
    @Render(PostNLPAnalyzerAst)
    render(ast: PostNLPAnalyzerAst) {
        return <PostNLPAnalyzerComponent ast={ast} />;
    }
}