import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { EventAutoCreatorAst } from "@sker/workflow-ast";
import React from "react";

const EventAutoCreatorComponent: React.FC<{ ast: EventAutoCreatorAst }> = ({ ast }) => (
    <></>
);

@Injectable()
export class EventAutoCreatorAstRender {
    @Render(EventAutoCreatorAst)
    render(ast: EventAutoCreatorAst) {
        return <EventAutoCreatorComponent ast={ast} />;
    }
}