import { Injectable } from "@sker/core";
import { Render, serializeToString } from "@sker/workflow";
import { HtmlDisplayAst } from "@sker/workflow-ast";
import { HtmlViewer } from "@sker/ui/components/ui/html-viewer";
import React from "react";

@Injectable()
export class HtmlDisplayAstRender {
    @Render(HtmlDisplayAst)
    render(ast: HtmlDisplayAst) {
        const htmlContent = serializeToString(ast.rendered || ast.html);
        return <HtmlViewer showFullscreen maxHeight="300px">{htmlContent}</HtmlViewer>;
    }
}
