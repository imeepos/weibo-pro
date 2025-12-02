import { Ast, Input, IS_BUFFER, IS_MULTI, Node, Output } from "@sker/workflow";

@Node()
export class LlmVideoToTextAst extends Ast {

    @Input({ title: '视频', mode: IS_MULTI | IS_BUFFER })
    videos: string[] = [];

    @Output()
    text: string = ``;

    type: `LlmVideoToTextAst` = `LlmVideoToTextAst`
}
