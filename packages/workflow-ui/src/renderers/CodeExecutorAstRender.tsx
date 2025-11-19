import { Injectable } from "@sker/core";
import { Render } from "@sker/workflow";
import { CodeExecutorAst } from "@sker/workflow-ast";
import React from "react";

const CodeExecutorComponent: React.FC<{ ast: CodeExecutorAst }> = ({ ast }) => {
  return (
    <></>
  );
};

@Injectable()
export class CodeExecutorAstRender {
  @Render(CodeExecutorAst)
  render(ast: CodeExecutorAst) {
    return <CodeExecutorComponent ast={ast} />;
  }
}
