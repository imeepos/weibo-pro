import { root } from "@sker/core";
import { Ast, RENDER_METHOD } from "@sker/workflow";
import React, { useMemo } from "react";
import "../../renderers";
export function useRender(ast: Ast) {
    return useMemo(() => {
        const methods = root.get(RENDER_METHOD, [])
        const method = methods.find(it => it.ast.name === ast.type)
        if (method) {
            const instance = root.get(method.target)
            const render = Reflect.get(instance, method.property)
            return render(ast);
        }
    }, [ast])
}