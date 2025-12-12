import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";

@Injectable()
export class LlmCategoryAstRender {
    @Render(LlmCategoryAst)
    render(_ast: LlmCategoryAst) {
        return null;
    }
}
