import { Injectable, root } from "@sker/core";
import { INode } from "../types";
import { Observable, Subject, map, switchMap } from "rxjs";
import { VisitorExecutor } from "../execution/visitor-executor";
import { WorkflowGraphAst } from "../ast";

@Injectable()
export class Executor {
    execute<In, Out>(node: INode, input: Subject<In>, ctx: WorkflowGraphAst): Observable<Out> {
        const visitor = root.get(VisitorExecutor);
        return input.pipe(
            map(data => Object.assign(node, data)),
            switchMap(updatedNode => visitor.visit(updatedNode, ctx) as Observable<Out>)
        );
    }
}

@Injectable()
export class Outputer {
    create<Out>(node: INode, ctx: WorkflowGraphAst): Observable<Out> {
        const inputer = root.get(Inputer);
        const inputs = inputer.create(node);
        const executor = root.get(Executor);
        return executor.execute(node, inputs, ctx);
    }
}

@Injectable()
export class Inputer {
    create<In>(node: INode): Subject<In> {
        return new Subject<In>();
    }
}