import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { BatchPushToMQAst } from "@sker/workflow-ast";
import React from "react";

const BatchPushToMQComponent: React.FC<{ ast: BatchPushToMQAst }> = ({ ast }) => {
    return (
        <></>
    );
};

@Injectable()
export class BatchPushToMQAstRender {
    @Render(BatchPushToMQAst)
    render(ast: BatchPushToMQAst) {
        return <BatchPushToMQComponent ast={ast} />;
    }
}