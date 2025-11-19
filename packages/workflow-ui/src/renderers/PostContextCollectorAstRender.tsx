import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { PostContextCollectorAst } from "@sker/workflow-ast";
import React from "react";

const PostContextCollectorComponent: React.FC<{ ast: PostContextCollectorAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class PostContextCollectorAstRender {
    @Render(PostContextCollectorAst)
    render(ast: PostContextCollectorAst) {
        return <PostContextCollectorComponent ast={ast} />;
    }
}