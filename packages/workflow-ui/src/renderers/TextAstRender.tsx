import { Injectable } from "@sker/core";
import { Render, TextAst } from "@sker/workflow";
import React from "react";

const TextComponent: React.FC<{ ast: TextAst }> = ({ ast }) => (
    <div className="space-y-1.5 text-xs">{ast.type}</div>
);

@Injectable()
export class TextAstRender {
    @Render(TextAst)
    render(ast: TextAst) {
        return <TextComponent ast={ast} />;
    }
}